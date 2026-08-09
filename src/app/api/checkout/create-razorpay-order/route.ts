import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { resolveCartItems, computeShipping, computeCoupon } from "@/lib/checkout";
import { logError } from "@/lib/error-logger";

async function getRazorpayCredentials() {
  const [idSetting, secretSetting] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "razorpay_key_id" } }),
    prisma.siteSetting.findUnique({ where: { key: "razorpay_key_secret" } }),
  ]);

  const keyId = idSetting ? JSON.parse(idSetting.value) : process.env.RAZORPAY_KEY_ID;
  const encryptedSecret = secretSetting ? JSON.parse(secretSetting.value) : "";
  const keySecret = encryptedSecret ? decrypt(encryptedSecret) : process.env.RAZORPAY_KEY_SECRET;

  return { keyId, keySecret };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const items = body.items ?? [];
    const couponCode = body.couponCode as string | undefined;

    const { subtotal } = await resolveCartItems(items);
    const shippingAmount = await computeShipping(subtotal);
    const { discount, freeShipping } = await computeCoupon(couponCode, subtotal, session.user.id);
    const finalShipping = freeShipping ? 0 : shippingAmount;
    const totalAmount = Math.max(0, subtotal - discount + finalShipping);

    const { keyId, keySecret } = await getRazorpayCredentials();

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, data: null, error: "Razorpay is not configured. Please contact the store admin or use Cash on Delivery." },
        { status: 503 }
      );
    }

    const auth64 = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth64}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      }),
    });

    if (!razorpayRes.ok) {
      const errText = await razorpayRes.text();
      throw new Error(`Razorpay order creation failed: ${errText}`);
    }

    const razorpayOrder = await razorpayRes.json();

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId,
        totalAmount,
      },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to create Razorpay order",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/checkout/create-razorpay-order",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: err instanceof Error ? err.message : "Failed to create order" },
      { status: 500 }
    );
  }
}

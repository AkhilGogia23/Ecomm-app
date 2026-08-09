import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { createOrderFromCart } from "@/lib/checkout";
import { queueEmail } from "@/lib/email";
import { formatPrice } from "@/lib/utils/price";
import { logError } from "@/lib/error-logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      shippingAddress,
      couponCode,
      customerNotes,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, data: null, error: "Missing payment verification fields" }, { status: 400 });
    }

    const secretSetting = await prisma.siteSetting.findUnique({ where: { key: "razorpay_key_secret" } });
    const encryptedSecret = secretSetting ? JSON.parse(secretSetting.value) : "";
    const keySecret = encryptedSecret ? decrypt(encryptedSecret) : process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json({ success: false, data: null, error: "Payment gateway not configured" }, { status: 503 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, data: null, error: "Payment verification failed" }, { status: 400 });
    }

    const order = await createOrderFromCart({
      customerId: session.user.id,
      items,
      shippingAddress,
      paymentMethod: "RAZORPAY",
      couponCode,
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature,
      customerNotes,
    });

    await prisma.order.update({ where: { id: order.id }, data: { paymentGatewayId: razorpay_payment_id } });

    queueEmail({
      to: session.user.email ?? "",
      subject: `Order confirmed: ${order.orderNumber}`,
      html: `<div><h1>Thank you for your order!</h1><p>Your order ${order.orderNumber} totaling ${formatPrice(order.totalAmount)} has been confirmed.</p></div>`,
    });

    return NextResponse.json({ success: true, data: { orderId: order.id, orderNumber: order.orderNumber }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Payment verification failed",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/checkout/verify-payment",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: err instanceof Error ? err.message : "Payment verification failed" },
      { status: 500 }
    );
  }
}

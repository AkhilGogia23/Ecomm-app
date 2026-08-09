import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    const cartTotal = Number(body.cartTotal ?? 0);

    if (!code) {
      return NextResponse.json({ success: false, data: null, error: "Coupon code is required" }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ success: false, data: null, error: "Invalid or inactive coupon code" }, { status: 404 });
    }

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return NextResponse.json({ success: false, data: null, error: "This coupon is not active yet" }, { status: 400 });
    }
    if (coupon.endDate && now > coupon.endDate) {
      return NextResponse.json({ success: false, data: null, error: "This coupon has expired" }, { status: 400 });
    }
    if (coupon.minOrderAmount && cartTotal < coupon.minOrderAmount) {
      return NextResponse.json(
        { success: false, data: null, error: `Minimum order amount of ₹${coupon.minOrderAmount} required` },
        { status: 400 }
      );
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ success: false, data: null, error: "This coupon has reached its usage limit" }, { status: 400 });
    }

    if (session?.user?.id) {
      const userUsageCount = await prisma.couponUsage.count({
        where: { couponId: coupon.id, userId: session.user.id },
      });
      if (userUsageCount >= coupon.perUserLimit) {
        return NextResponse.json(
          { success: false, data: null, error: "You have already used this coupon the maximum number of times" },
          { status: 400 }
        );
      }
    }

    let discount = 0;
    if (coupon.type === "PERCENTAGE") {
      discount = (cartTotal * coupon.value) / 100;
      if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
    } else if (coupon.type === "FIXED") {
      discount = Math.min(coupon.value, cartTotal);
    } else if (coupon.type === "FREE_SHIPPING") {
      discount = 0;
    }

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount: Math.round(discount * 100) / 100,
        freeShipping: coupon.type === "FREE_SHIPPING",
      },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to validate coupon",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/coupons/validate",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to validate coupon" }, { status: 500 });
  }
}

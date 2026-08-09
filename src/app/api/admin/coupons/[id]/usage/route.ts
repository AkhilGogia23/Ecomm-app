import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return NextResponse.json({ success: false, data: null, error: "Coupon not found" }, { status: 404 });
    }

    const usages = await prisma.couponUsage.findMany({
      where: { couponId: id },
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true, totalAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalDiscountGiven = usages.reduce((sum, u) => sum + u.discountApplied, 0);
    const revenueFromCouponOrders = usages.reduce((sum, u) => sum + u.order.totalAmount, 0);

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        timesUsed: usages.length,
        totalDiscountGiven,
        revenueFromCouponOrders,
        usages: usages.map((u) => ({
          id: u.id,
          userName: u.user.name,
          userEmail: u.user.email,
          orderNumber: u.order.orderNumber,
          orderTotal: u.order.totalAmount,
          discountApplied: u.discountApplied,
          createdAt: u.createdAt,
        })),
      },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load coupon usage",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/coupons/[id]/usage",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load coupon usage" }, { status: 500 });
  }
}

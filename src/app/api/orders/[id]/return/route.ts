import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findFirst({ where: { id, customerId: session.user.id } });
    if (!order) {
      return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "DELIVERED" || !order.deliveredAt) {
      return NextResponse.json({ success: false, data: null, error: "Only delivered orders can be returned" }, { status: 400 });
    }

    const daysSinceDelivery = (Date.now() - order.deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 7) {
      return NextResponse.json({ success: false, data: null, error: "Return window has expired (7 days)" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({ where: { id }, data: { status: "RETURNED" } });
      await tx.orderTimeline.create({
        data: { orderId: id, status: "RETURNED", note: "Return requested by customer", changedBy: session.user.name ?? "Customer" },
      });
      return result;
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to request return",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/orders/[id]/return",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to request return" }, { status: 500 });
  }
}

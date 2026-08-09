import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processRefundSchema } from "@/lib/validators/order";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { queueEmail } from "@/lib/email";
import { formatPrice } from "@/lib/utils/price";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: { select: { name: true, email: true } } },
    });
    if (!order) {
      return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
    }
    if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
      return NextResponse.json(
        { success: false, data: null, error: "Only paid orders can be refunded" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = processRefundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { amount, reason, isFullRefund } = parsed.data;
    const refundAmount = isFullRefund ? order.totalAmount : amount;

    if (refundAmount > order.totalAmount) {
      return NextResponse.json(
        { success: false, data: null, error: "Refund amount cannot exceed order total" },
        { status: 400 }
      );
    }

    const newPaymentStatus = isFullRefund || refundAmount >= order.totalAmount ? "REFUNDED" : "PARTIALLY_REFUNDED";

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: { paymentStatus: newPaymentStatus },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: id,
          status: order.status,
          note: `Refund of ${formatPrice(refundAmount)} processed. Reason: ${reason}`,
          changedBy: session?.user?.name ?? "System",
        },
      });

      return result;
    });

    queueEmail({
      to: order.customer.email,
      subject: `Refund processed for order ${order.orderNumber}`,
      html: `<div><h1>Refund Processed</h1><p>Hi ${order.customer.name}, a refund of ${formatPrice(refundAmount)} has been processed for your order ${order.orderNumber}.</p><p>Reason: ${reason}</p></div>`,
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.ORDER,
      entityId: id,
      previousData: { paymentStatus: order.paymentStatus },
      newData: { paymentStatus: newPaymentStatus, refundAmount, reason },
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to process refund",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/orders/[id]/refund",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to process refund" }, { status: 500 });
  }
}

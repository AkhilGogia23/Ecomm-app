import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateOrderStatusSchema } from "@/lib/validators/order";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { queueEmail } from "@/lib/email";
import { formatPrice } from "@/lib/utils/price";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await req.json();
    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { status, note, trackingNumber, trackingUrl } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: {
          status,
          trackingNumber: trackingNumber ?? order.trackingNumber,
          trackingUrl: trackingUrl ?? order.trackingUrl,
          shippedAt: status === "SHIPPED" ? new Date() : order.shippedAt,
          deliveredAt: status === "DELIVERED" ? new Date() : order.deliveredAt,
          cancelledAt: status === "CANCELLED" ? new Date() : order.cancelledAt,
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: id,
          status,
          note: note ?? null,
          changedBy: session?.user?.name ?? "System",
        },
      });

      return result;
    });

    queueEmail({
      to: order.customer.email,
      subject: `Your order ${order.orderNumber} is now ${status.toLowerCase()}`,
      html: `<div><h1>Order Update</h1><p>Hi ${order.customer.name}, your order ${order.orderNumber} (${formatPrice(order.totalAmount)}) status has changed to <strong>${status}</strong>.</p>${note ? `<p>${note}</p>` : ""}${trackingNumber ? `<p>Tracking: ${trackingNumber}</p>` : ""}</div>`,
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.ORDER,
      entityId: id,
      previousData: { status: order.status },
      newData: { status },
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update order status",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/orders/[id]/status",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update order status" }, { status: 500 });
  }
}

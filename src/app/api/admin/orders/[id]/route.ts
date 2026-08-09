import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        timeline: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load order",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/orders/[id]",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load order" }, { status: 500 });
  }
}

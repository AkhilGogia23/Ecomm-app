import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { items: { select: { id: true } } },
    });

    return NextResponse.json({ success: true, data: orders, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load orders",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/orders",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load orders" }, { status: 500 });
  }
}

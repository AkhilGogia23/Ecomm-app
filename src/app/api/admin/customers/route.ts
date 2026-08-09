import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

type Segment = "VIP" | "REGULAR" | "NEW" | "INACTIVE" | "STANDARD";

function computeSegment(orderCount: number, totalSpent: number, joinedAt: Date, lastOrderAt: Date | null): Segment {
  const daysSinceJoined = (Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24);
  const daysSinceLastOrder = lastOrderAt ? (Date.now() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity;

  if (totalSpent > 10000) return "VIP";
  if (daysSinceLastOrder > 90 && orderCount > 0) return "INACTIVE";
  if (daysSinceJoined < 30) return "NEW";
  if (orderCount >= 2) return "REGULAR";
  return "STANDARD";
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const search = params.get("search");
    const segment = params.get("segment");
    const page = Math.max(1, Number(params.get("page") ?? "1"));
    const limit = Math.min(1000, Math.max(1, Number(params.get("limit") ?? "20")));

    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        orders: { select: { totalAmount: true, createdAt: true, paymentStatus: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let data = customers.map((c) => {
      const paidOrders = c.orders.filter((o) => o.paymentStatus === "PAID");
      const totalSpent = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const lastOrderAt = c.orders.length > 0
        ? c.orders.reduce((latest, o) => (o.createdAt > latest ? o.createdAt : latest), c.orders[0].createdAt)
        : null;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        ordersCount: c.orders.length,
        totalSpent,
        joinedAt: c.createdAt,
        isActive: c.isActive,
        segment: computeSegment(c.orders.length, totalSpent, c.createdAt, lastOrderAt),
      };
    });

    if (segment) {
      data = data.filter((c) => c.segment === segment);
    }

    const total = data.length;
    const paginated = data.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      error: null,
      data: paginated,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load customers",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/customers",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load customers" }, { status: 500 });
  }
}

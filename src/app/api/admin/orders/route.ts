import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") ?? "1"));
    const limit = Math.min(1000, Math.max(1, Number(params.get("limit") ?? "20")));
    const status = params.get("status");
    const paymentStatus = params.get("paymentStatus");
    const search = params.get("search");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const minAmount = params.get("minAmount");
    const maxAmount = params.get("maxAmount");

    const where = {
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(minAmount || maxAmount
        ? {
            totalAmount: {
              ...(minAmount ? { gte: Number(minAmount) } : {}),
              ...(maxAmount ? { lte: Number(maxAmount) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search } },
              { customer: { name: { contains: search } } },
              { customer: { email: { contains: search } } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { name: true, email: true } },
          items: { select: { id: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const data = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer.name,
      customerEmail: o.customer.email,
      itemCount: o.items.length,
      totalAmount: o.totalAmount,
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({
      success: true,
      error: null,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load orders",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/orders",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load orders" }, { status: 500 });
  }
}

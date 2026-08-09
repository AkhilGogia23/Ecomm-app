import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(req: NextRequest) {
  try {
    const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get("days") ?? "30")));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const rangeStart = new Date(startOfToday.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const [todayOrders, newCustomers, lowStockVariants, ordersInRange, recentOrders] =
      await Promise.all([
        prisma.order.findMany({
          where: { createdAt: { gte: startOfToday, lt: endOfToday }, paymentStatus: "PAID" },
          select: { totalAmount: true },
        }),
        prisma.user.count({
          where: { role: "CUSTOMER", createdAt: { gte: startOfToday, lt: endOfToday } },
        }),
        prisma.productVariant.findMany({
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            stock: true,
            lowStockThreshold: true,
            product: { select: { title: true } },
          },
        }),
        prisma.order.findMany({
          where: { createdAt: { gte: rangeStart, lt: endOfToday }, paymentStatus: "PAID" },
          select: { totalAmount: true, createdAt: true },
        }),
        prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            customer: { select: { name: true, email: true } },
          },
        }),
      ]);

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const lowStockAlerts = lowStockVariants
      .filter((v) => v.stock <= v.lowStockThreshold)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 20)
      .map((v) => ({
        variantId: v.id,
        productTitle: v.product.title,
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock: v.stock,
        threshold: v.lowStockThreshold,
      }));

    const revenueByDay = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000);
      revenueByDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const order of ordersInRange) {
      const key = order.createdAt.toISOString().slice(0, 10);
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.totalAmount);
    }
    const revenueSeries = Array.from(revenueByDay.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    const topOrderItems = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { total: true, quantity: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    });

    const topProductIds = topOrderItems.map((i) => i.productId);
    const topProductsData = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, title: true },
    });
    const topProductMap = new Map(topProductsData.map((p) => [p.id, p.title]));

    const topProducts = topOrderItems.map((item) => ({
      productId: item.productId,
      title: topProductMap.get(item.productId) ?? "Unknown",
      unitsSold: item._sum.quantity ?? 0,
      revenue: item._sum.total ?? 0,
    }));

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        stats: {
          todayRevenue,
          todayOrders: todayOrders.length,
          newCustomers,
          lowStockCount: lowStockAlerts.length,
        },
        revenueSeries,
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customer.name,
          customerEmail: o.customer.email,
          totalAmount: o.totalAmount,
          status: o.status,
          paymentStatus: o.paymentStatus,
          createdAt: o.createdAt,
        })),
        lowStockAlerts,
        topProducts,
      },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Dashboard fetch failed",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/dashboard",
      method: "GET",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}

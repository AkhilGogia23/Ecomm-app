import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(req: NextRequest) {
  try {
    const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? "30")));
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const rangeStart = new Date(startOfToday.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    // --- Sales overview ---
    const paidOrders = await prisma.order.findMany({
      where: { createdAt: { gte: rangeStart, lt: endOfToday }, paymentStatus: "PAID" },
      select: { totalAmount: true, createdAt: true },
    });
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = paidOrders.length;
    const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

    const revenueByDay = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000);
      revenueByDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of paidOrders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + o.totalAmount);
    }
    const salesSeries = Array.from(revenueByDay.entries()).map(([date, revenue]) => ({ date, revenue }));

    // --- Revenue by category ---
    const orderItemsInRange = await prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: rangeStart, lt: endOfToday }, paymentStatus: "PAID" } },
      select: {
        total: true,
        product: { select: { categories: { include: { category: { select: { name: true } } } } } },
      },
    });
    const revenueByCategoryMap = new Map<string, number>();
    for (const item of orderItemsInRange) {
      const categories = item.product.categories;
      if (categories.length === 0) {
        revenueByCategoryMap.set("Uncategorized", (revenueByCategoryMap.get("Uncategorized") ?? 0) + item.total);
      }
      for (const pc of categories) {
        const name = pc.category.name;
        revenueByCategoryMap.set(name, (revenueByCategoryMap.get(name) ?? 0) + item.total);
      }
    }
    const revenueByCategory = Array.from(revenueByCategoryMap.entries())
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // --- Top products ---
    const topByRevenue = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: rangeStart, lt: endOfToday }, paymentStatus: "PAID" } },
      _sum: { total: true, quantity: true },
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    });
    const topProductIds = topByRevenue.map((t) => t.productId);
    const topProductsData = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, title: true, viewCount: true },
    });
    const topProductMap = new Map(topProductsData.map((p) => [p.id, p]));
    const topProducts = topByRevenue.map((t) => ({
      productId: t.productId,
      title: topProductMap.get(t.productId)?.title ?? "Unknown",
      revenue: t._sum.total ?? 0,
      unitsSold: t._sum.quantity ?? 0,
      views: topProductMap.get(t.productId)?.viewCount ?? 0,
    }));

    // --- Customer report ---
    const newCustomers = await prisma.user.count({
      where: { role: "CUSTOMER", createdAt: { gte: rangeStart, lt: endOfToday } },
    });
    const customersWithOrdersInRange = await prisma.order.findMany({
      where: { createdAt: { gte: rangeStart, lt: endOfToday } },
      select: { customerId: true, customer: { select: { createdAt: true } } },
      distinct: ["customerId"],
    });
    const returningCustomers = customersWithOrdersInRange.filter(
      (o) => o.customer.createdAt < rangeStart
    ).length;

    // --- Inventory report ---
    const variants = await prisma.productVariant.findMany({
      select: {
        stock: true,
        product: {
          select: {
            costPrice: true,
            categories: { include: { category: { select: { name: true } } } },
          },
        },
      },
    });
    let totalStockValue = 0;
    const stockValueByCategory = new Map<string, number>();
    for (const v of variants) {
      const value = v.stock * (v.product.costPrice ?? 0);
      totalStockValue += value;
      const categories = v.product.categories;
      if (categories.length === 0) {
        stockValueByCategory.set("Uncategorized", (stockValueByCategory.get("Uncategorized") ?? 0) + value);
      }
      for (const pc of categories) {
        stockValueByCategory.set(pc.category.name, (stockValueByCategory.get(pc.category.name) ?? 0) + value);
      }
    }
    const inventoryByCategory = Array.from(stockValueByCategory.entries()).map(([category, value]) => ({
      category,
      value,
    }));

    // --- Coupon performance ---
    const coupons = await prisma.coupon.findMany({
      include: { usages: { include: { order: { select: { totalAmount: true } } } } },
    });
    const couponPerformance = coupons.map((c) => ({
      code: c.code,
      usageCount: c.usages.length,
      totalDiscount: c.usages.reduce((sum, u) => sum + u.discountApplied, 0),
      revenue: c.usages.reduce((sum, u) => sum + u.order.totalAmount, 0),
    }));

    // --- Abandoned carts ---
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const abandonedCarts = await prisma.cart.findMany({
      where: { updatedAt: { lt: oneHourAgo }, items: { some: {} } },
      include: { items: { include: { product: { select: { basePrice: true } }, variant: { select: { price: true } } } } },
    });
    const abandonedCartsCount = abandonedCarts.length;
    const abandonedCartsRevenue = abandonedCarts.reduce(
      (sum, cart) =>
        sum +
        cart.items.reduce((itemSum, item) => itemSum + (item.variant?.price ?? item.product.basePrice) * item.quantity, 0),
      0
    );

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        salesOverview: { totalRevenue, orderCount, aov, series: salesSeries },
        revenueByCategory,
        topProducts,
        customerReport: { newCustomers, returningCustomers },
        inventoryReport: { totalStockValue, byCategory: inventoryByCategory },
        couponPerformance,
        abandonedCarts: { count: abandonedCartsCount, potentialRevenue: abandonedCartsRevenue },
      },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load analytics",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/analytics",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load analytics" }, { status: 500 });
  }
}

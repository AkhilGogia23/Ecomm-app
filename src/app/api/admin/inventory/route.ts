import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(req: NextRequest) {
  try {
    const filter = req.nextUrl.searchParams.get("filter"); // low_stock | out_of_stock
    const category = req.nextUrl.searchParams.get("category");
    const productId = req.nextUrl.searchParams.get("productId");
    const search = req.nextUrl.searchParams.get("search");

    const variants = await prisma.productVariant.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(category
          ? { product: { categories: { some: { category: { slug: category } } } } }
          : {}),
        ...(search
          ? {
              OR: [
                { sku: { contains: search } },
                { product: { title: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        product: { select: { id: true, title: true, sku: true } },
      },
      orderBy: { stock: "asc" },
    });

    let data = variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      productTitle: v.product.title,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: v.stock,
      reservedStock: v.reservedStock,
      available: v.stock - v.reservedStock,
      lowStockThreshold: v.lowStockThreshold,
      status: v.stock === 0 ? "OUT_OF_STOCK" : v.stock <= v.lowStockThreshold ? "LOW_STOCK" : "IN_STOCK",
    }));

    if (filter === "low_stock") {
      data = data.filter((v) => v.status === "LOW_STOCK");
    } else if (filter === "out_of_stock") {
      data = data.filter((v) => v.status === "OUT_OF_STOCK");
    }

    return NextResponse.json({ success: true, data, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load inventory",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/inventory",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load inventory" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

const SORT_MAP: Record<string, { field: string; direction: "asc" | "desc" }> = {
  newest: { field: "createdAt", direction: "desc" },
  price_asc: { field: "basePrice", direction: "asc" },
  price_desc: { field: "basePrice", direction: "desc" },
  bestselling: { field: "viewCount", direction: "desc" },
  name_asc: { field: "title", direction: "asc" },
};

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? "24")));
    const category = params.get("category");
    const collection = params.get("collection");
    const search = params.get("search");
    const sort = params.get("sort") ?? "newest";
    const sizes = params.get("sizes")?.split(",").filter(Boolean) ?? [];
    const colors = params.get("colors")?.split(",").filter(Boolean) ?? [];
    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    const inStock = params.get("inStock") === "true";
    const featured = params.get("featured") === "true";
    const newArrival = params.get("newArrival") === "true";
    const bestseller = params.get("bestseller") === "true";
    const excludeId = params.get("excludeId");

    const sortConfig = SORT_MAP[sort] ?? SORT_MAP.newest;

    const where = {
      isDeleted: false,
      status: "ACTIVE",
      ...(excludeId ? { id: { not: excludeId } } : {}),
      ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
      ...(collection ? { collections: { some: { collection: { slug: collection } } } } : {}),
      ...(featured ? { isFeatured: true } : {}),
      ...(newArrival ? { isNewArrival: true } : {}),
      ...(bestseller ? { isBestseller: true } : {}),
      ...(search
        ? { OR: [{ title: { contains: search } }, { description: { contains: search } }] }
        : {}),
      ...(minPrice || maxPrice
        ? {
            basePrice: {
              ...(minPrice ? { gte: Number(minPrice) } : {}),
              ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            },
          }
        : {}),
      ...(sizes.length > 0 || colors.length > 0 || inStock
        ? {
            variants: {
              some: {
                isActive: true,
                ...(sizes.length > 0 ? { size: { in: sizes } } : {}),
                ...(colors.length > 0 ? { color: { in: colors } } : {}),
                ...(inStock ? { stock: { gt: 0 } } : {}),
              },
            },
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { [sortConfig.field]: sortConfig.direction },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { orderBy: { position: "asc" }, take: 2 },
          variants: { where: { isActive: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const data = products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      shortDescription: p.shortDescription,
      basePrice: p.basePrice,
      salePrice: p.salePrice,
      isNewArrival: p.isNewArrival,
      isBestseller: p.isBestseller,
      images: p.images.map((i) => ({ filePath: i.filePath, thumbPath: i.thumbPath })),
      totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
      sizes: Array.from(new Set(p.variants.map((v) => v.size).filter(Boolean))),
      colors: Array.from(new Set(p.variants.map((v) => v.color).filter(Boolean))),
    }));

    return NextResponse.json({
      success: true,
      error: null,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load products",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/products",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load products" }, { status: 500 });
  }
}

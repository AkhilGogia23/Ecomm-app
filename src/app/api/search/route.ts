import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const q = params.get("q")?.trim() ?? "";
    const page = Math.max(1, Number(params.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, Number(params.get("limit") ?? "24")));

    if (!q) {
      return NextResponse.json({
        success: true,
        error: null,
        data: [],
        meta: { page: 1, limit, total: 0, totalPages: 0 },
      });
    }

    const where = {
      isDeleted: false,
      status: "ACTIVE",
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { sku: { contains: q } },
        { tags: { some: { tag: { name: { contains: q } } } } },
      ],
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { viewCount: "desc" },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
      }),
      prisma.product.count({ where }),
    ]);

    const data = products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      basePrice: p.basePrice,
      salePrice: p.salePrice,
      images: p.images.map((i) => ({ filePath: i.filePath, thumbPath: i.thumbPath })),
    }));

    return NextResponse.json({
      success: true,
      error: null,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Search failed",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/search",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Search failed" }, { status: 500 });
  }
}

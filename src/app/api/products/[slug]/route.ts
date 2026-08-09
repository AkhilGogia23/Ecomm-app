import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const product = await prisma.product.findFirst({
      where: { slug, isDeleted: false, status: "ACTIVE" },
      include: {
        variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        images: { orderBy: { position: "asc" } },
        categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
    }

    prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    const categoryIds = product.categories.map((c) => c.category.id);
    const relatedProducts =
      categoryIds.length > 0
        ? await prisma.product.findMany({
            where: {
              isDeleted: false,
              status: "ACTIVE",
              id: { not: product.id },
              categories: { some: { categoryId: { in: categoryIds } } },
            },
            take: 4,
            include: { images: { orderBy: { position: "asc" }, take: 1 } },
          })
        : [];

    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        ...product,
        avgRating,
        reviewCount: product.reviews.length,
        relatedProducts: relatedProducts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          basePrice: p.basePrice,
          salePrice: p.salePrice,
          images: p.images.map((i) => ({ filePath: i.filePath, thumbPath: i.thumbPath })),
        })),
      },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load product",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/products/[slug]",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load product" }, { status: 500 });
  }
}

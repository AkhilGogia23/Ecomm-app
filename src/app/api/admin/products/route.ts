import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProductSchema, productQuerySchema } from "@/lib/validators/product";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

const SORT_MAP: Record<string, { field: string; direction: "asc" | "desc" }> = {
  newest: { field: "createdAt", direction: "desc" },
  price_asc: { field: "basePrice", direction: "asc" },
  price_desc: { field: "basePrice", direction: "desc" },
  bestselling: { field: "viewCount", direction: "desc" },
  name_asc: { field: "title", direction: "asc" },
};

export async function GET(req: NextRequest) {
  try {
    const parsed = productQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid query" },
        { status: 400 }
      );
    }

    const { page, limit, status, category, search, sort } = parsed.data;
    const sortConfig = SORT_MAP[sort] ?? SORT_MAP.newest;

    const where = {
      isDeleted: false,
      ...(status ? { status } : {}),
      ...(category
        ? { categories: { some: { category: { slug: category } } } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { sku: { contains: search } },
            ],
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
          images: { select: { id: true, filePath: true, isThumbnail: true }, orderBy: { position: "asc" } },
          variants: { select: { id: true, stock: true } },
          categories: { include: { category: { select: { name: true } } } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const data = products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      sku: p.sku,
      basePrice: p.basePrice,
      salePrice: p.salePrice,
      status: p.status,
      thumbnail: p.images.find((i) => i.isThumbnail)?.filePath ?? p.images[0]?.filePath ?? null,
      imageCount: p.images.length,
      variantCount: p.variants.length,
      totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
      categoryNames: p.categories.map((c) => c.category.name),
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      success: true,
      error: null,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to list products",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products",
      method: "GET",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to load products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const existingSku = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (existingSku) {
      return NextResponse.json(
        { success: false, data: null, error: "A product with this SKU already exists" },
        { status: 409 }
      );
    }

    const slug = await generateUniqueSlug(input.title, async (s) => {
      const found = await prisma.product.findUnique({ where: { slug: s } });
      return !!found;
    });

    const product = await prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          title: input.title,
          slug,
          description: input.description,
          shortDescription: input.shortDescription,
          sku: input.sku,
          barcode: input.barcode,
          basePrice: input.basePrice,
          salePrice: input.salePrice,
          costPrice: input.costPrice,
          currency: input.currency,
          status: input.status,
          isFeatured: input.isFeatured,
          isNewArrival: input.isNewArrival,
          isBestseller: input.isBestseller,
          weight: input.weight,
          weightUnit: input.weightUnit,
          hsnCode: input.hsnCode,
          taxRate: input.taxRate,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          metaKeywords: input.metaKeywords,
          publishedAt: input.status === "ACTIVE" ? new Date() : null,
          createdById: session?.user?.id,
          categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
          collections: { create: input.collectionIds.map((collectionId) => ({ collectionId })) },
          tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
          variants: {
            create: input.variants.map((v) => ({
              sku: v.sku,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex,
              material: v.material,
              stock: v.stock,
              lowStockThreshold: v.lowStockThreshold,
              price: v.price,
              salePrice: v.salePrice,
              barcode: v.barcode,
              isActive: v.isActive,
              sortOrder: v.sortOrder,
            })),
          },
        },
        include: { variants: true, images: true },
      });
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.PRODUCT,
      entityId: product.id,
      newData: { title: product.title, sku: product.sku, status: product.status },
    });

    invalidateCache("products:");

    return NextResponse.json({ success: true, data: product, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to create product",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to create product" },
      { status: 500 }
    );
  }
}

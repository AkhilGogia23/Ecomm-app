import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProductSchema } from "@/lib/validators/product";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

async function getFullProduct(id: string) {
  return prisma.product.findFirst({
    where: { id, isDeleted: false },
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: { position: "asc" } },
      categories: { include: { category: true } },
      collections: { include: { collection: true } },
      tags: { include: { tag: true } },
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getFullProduct(id);

  if (!product) {
    return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: product, error: null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await getFullProduct(id);
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      if (input.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
      }
      if (input.collectionIds) {
        await tx.productCollection.deleteMany({ where: { productId: id } });
      }
      if (input.tagIds) {
        await tx.productTag.deleteMany({ where: { productId: id } });
      }

      if (input.variants) {
        const incomingIds = input.variants.filter((v) => v.id).map((v) => v.id as string);
        await tx.productVariant.deleteMany({
          where: { productId: id, id: { notIn: incomingIds.length > 0 ? incomingIds : ["__none__"] } },
        });

        for (const v of input.variants) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
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
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
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
              },
            });
          }
        }
      }

      return tx.product.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
          ...(input.sku !== undefined ? { sku: input.sku } : {}),
          ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
          ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
          ...(input.salePrice !== undefined ? { salePrice: input.salePrice } : {}),
          ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.status !== undefined
            ? {
                status: input.status,
                publishedAt: input.status === "ACTIVE" && !existing.publishedAt ? new Date() : existing.publishedAt,
              }
            : {}),
          ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
          ...(input.isNewArrival !== undefined ? { isNewArrival: input.isNewArrival } : {}),
          ...(input.isBestseller !== undefined ? { isBestseller: input.isBestseller } : {}),
          ...(input.weight !== undefined ? { weight: input.weight } : {}),
          ...(input.weightUnit !== undefined ? { weightUnit: input.weightUnit } : {}),
          ...(input.hsnCode !== undefined ? { hsnCode: input.hsnCode } : {}),
          ...(input.taxRate !== undefined ? { taxRate: input.taxRate } : {}),
          ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
          ...(input.metaDescription !== undefined ? { metaDescription: input.metaDescription } : {}),
          ...(input.metaKeywords !== undefined ? { metaKeywords: input.metaKeywords } : {}),
          ...(input.categoryIds
            ? { categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) } }
            : {}),
          ...(input.collectionIds
            ? { collections: { create: input.collectionIds.map((collectionId) => ({ collectionId })) } }
            : {}),
          ...(input.tagIds ? { tags: { create: input.tagIds.map((tagId) => ({ tagId })) } } : {}),
        },
        include: { variants: true, images: true },
      });
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.PRODUCT,
      entityId: id,
      previousData: { title: existing.title, status: existing.status, basePrice: existing.basePrice },
      newData: { title: updated.title, status: updated.status, basePrice: updated.basePrice },
    });

    invalidateCache("products:");

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update product",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products/[id]",
      method: "PUT",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
    }

    await prisma.product.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.PRODUCT,
      entityId: id,
      previousData: { title: existing.title, status: existing.status },
    });

    invalidateCache("products:");

    return NextResponse.json({ success: true, data: { id }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete product",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products/[id]",
      method: "DELETE",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

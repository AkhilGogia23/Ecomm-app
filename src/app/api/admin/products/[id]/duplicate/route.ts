import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const original = await prisma.product.findFirst({
      where: { id, isDeleted: false },
      include: {
        variants: true,
        categories: true,
        collections: true,
        tags: true,
      },
    });

    if (!original) {
      return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
    }

    const newTitle = `${original.title} (Copy)`;
    const slug = await generateUniqueSlug(newTitle, async (s) => {
      const found = await prisma.product.findUnique({ where: { slug: s } });
      return !!found;
    });

    let sku = `${original.sku}-COPY`;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { sku } })) {
      sku = `${original.sku}-COPY-${counter}`;
      counter += 1;
    }

    const duplicate = await prisma.product.create({
      data: {
        title: newTitle,
        slug,
        description: original.description,
        shortDescription: original.shortDescription,
        sku,
        basePrice: original.basePrice,
        salePrice: original.salePrice,
        costPrice: original.costPrice,
        currency: original.currency,
        status: "DRAFT",
        weight: original.weight,
        weightUnit: original.weightUnit,
        hsnCode: original.hsnCode,
        taxRate: original.taxRate,
        createdById: session?.user?.id,
        categories: { create: original.categories.map((c) => ({ categoryId: c.categoryId })) },
        collections: { create: original.collections.map((c) => ({ collectionId: c.collectionId })) },
        tags: { create: original.tags.map((t) => ({ tagId: t.tagId })) },
        variants: {
          create: original.variants.map((v, i) => ({
            sku: `${sku}-${v.size ?? "VAR"}-${v.color ?? i}`.toUpperCase().replace(/\s+/g, "-"),
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            material: v.material,
            stock: 0,
            lowStockThreshold: v.lowStockThreshold,
            price: v.price,
            salePrice: v.salePrice,
            isActive: v.isActive,
            sortOrder: v.sortOrder,
          })),
        },
      },
      include: { variants: true },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.PRODUCT,
      entityId: duplicate.id,
      newData: { title: duplicate.title, duplicatedFrom: original.id },
    });

    invalidateCache("products:");

    return NextResponse.json({ success: true, data: duplicate, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to duplicate product",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products/[id]/duplicate",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to duplicate product" },
      { status: 500 }
    );
  }
}

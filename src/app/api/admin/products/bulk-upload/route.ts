import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug, generateSlug } from "@/lib/utils/slug";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";
import type { CsvRow } from "@/lib/utils/csv-parser";

type ImportMode = "create" | "update" | "upsert";

interface RowError {
  row: number;
  field: string;
  message: string;
}

interface ProductGroup {
  sku: string;
  rows: { row: CsvRow; rowNum: number }[];
}

const BATCH_SIZE = 50;

export async function POST(req: NextRequest) {
  const session = await auth();

  try {
    const body = await req.json();
    const rows: CsvRow[] = body.rows ?? [];
    const mode: ImportMode = ["create", "update", "upsert"].includes(body.mode) ? body.mode : "upsert";

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, data: null, error: "No rows to import" },
        { status: 400 }
      );
    }

    const groups = new Map<string, ProductGroup>();
    rows.forEach((row, i) => {
      const sku = row.sku?.trim().toUpperCase();
      if (!sku) return;
      const rowNum = i + 2;
      if (!groups.has(sku)) groups.set(sku, { sku, rows: [] });
      groups.get(sku)!.rows.push({ row, rowNum });
    });

    const bulkJob = await prisma.bulkJob.create({
      data: {
        type: "PRODUCT_IMPORT",
        status: "PROCESSING",
        totalItems: groups.size,
        createdById: session?.user?.id ?? "",
        startedAt: new Date(),
      },
    });

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: RowError[] = [];

    const [allCategories, allCollections, allTags] = await Promise.all([
      prisma.category.findMany({ select: { id: true, slug: true } }),
      prisma.collection.findMany({ select: { id: true, slug: true } }),
      prisma.tag.findMany({ select: { id: true, slug: true, name: true } }),
    ]);
    const categoryBySlug = new Map(allCategories.map((c) => [c.slug, c.id]));
    const collectionBySlug = new Map(allCollections.map((c) => [c.slug, c.id]));
    const tagBySlug = new Map(allTags.map((t) => [t.slug, t.id]));

    const groupList = Array.from(groups.values());

    for (let i = 0; i < groupList.length; i += BATCH_SIZE) {
      const batch = groupList.slice(i, i + BATCH_SIZE);

      for (const group of batch) {
        const firstRow = group.rows[0].row;

        try {
          const existing = await prisma.product.findUnique({ where: { sku: group.sku } });

          if (existing && mode === "create") {
            skippedCount += 1;
            continue;
          }
          if (!existing && mode === "update") {
            skippedCount += 1;
            continue;
          }

          const basePrice = Number(firstRow.base_price);
          if (!firstRow.title?.trim() || Number.isNaN(basePrice)) {
            errors.push({
              row: group.rows[0].rowNum,
              field: "title/base_price",
              message: "Missing required title or invalid base_price",
            });
            errorCount += 1;
            continue;
          }

          const categoryIds = (firstRow.category_slugs ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((slug) => categoryBySlug.get(slug))
            .filter((v): v is string => !!v);

          const collectionIds = (firstRow.collection_slugs ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((slug) => collectionBySlug.get(slug))
            .filter((v): v is string => !!v);

          const tagNames = (firstRow.tags ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          const tagIds: string[] = [];
          for (const name of tagNames) {
            const slug = generateSlug(name);
            let tagId = tagBySlug.get(slug);
            if (!tagId) {
              const created = await prisma.tag.create({ data: { name, slug } });
              tagId = created.id;
              tagBySlug.set(slug, tagId);
            }
            tagIds.push(tagId);
          }

          const variantInputs = group.rows.map(({ row }) => ({
            sku: row.variant_sku?.trim() || `${group.sku}-${row.size ?? ""}-${row.color ?? ""}`.toUpperCase(),
            size: row.size || undefined,
            color: row.color || undefined,
            stock: Number(row.stock ?? 0) || 0,
          }));

          if (existing) {
            await prisma.$transaction(async (tx) => {
              await tx.productCategory.deleteMany({ where: { productId: existing.id } });
              await tx.productCollection.deleteMany({ where: { productId: existing.id } });
              await tx.productTag.deleteMany({ where: { productId: existing.id } });

              await tx.product.update({
                where: { id: existing.id },
                data: {
                  title: firstRow.title,
                  description: firstRow.description ?? existing.description,
                  shortDescription: firstRow.short_description ?? existing.shortDescription,
                  basePrice,
                  salePrice: firstRow.sale_price ? Number(firstRow.sale_price) : null,
                  status: firstRow.status || existing.status,
                  categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
                  collections: { create: collectionIds.map((collectionId) => ({ collectionId })) },
                  tags: { create: tagIds.map((tagId) => ({ tagId })) },
                },
              });

              for (const v of variantInputs) {
                await tx.productVariant.upsert({
                  where: { sku: v.sku },
                  update: { stock: v.stock, size: v.size, color: v.color },
                  create: {
                    productId: existing.id,
                    sku: v.sku,
                    size: v.size,
                    color: v.color,
                    stock: v.stock,
                  },
                });
              }
            });
          } else {
            const slug = await generateUniqueSlug(firstRow.title, async (s) => {
              const found = await prisma.product.findUnique({ where: { slug: s } });
              return !!found;
            });

            await prisma.product.create({
              data: {
                title: firstRow.title,
                slug,
                sku: group.sku,
                description: firstRow.description ?? "",
                shortDescription: firstRow.short_description,
                basePrice,
                salePrice: firstRow.sale_price ? Number(firstRow.sale_price) : undefined,
                status: firstRow.status || "DRAFT",
                createdById: session?.user?.id,
                categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
                collections: { create: collectionIds.map((collectionId) => ({ collectionId })) },
                tags: { create: tagIds.map((tagId) => ({ tagId })) },
                variants: { create: variantInputs },
              },
            });
          }

          successCount += 1;
        } catch (rowErr) {
          errorCount += 1;
          errors.push({
            row: group.rows[0].rowNum,
            field: "sku",
            message: rowErr instanceof Error ? rowErr.message : "Failed to import row",
          });
        }
      }

      await prisma.bulkJob.update({
        where: { id: bulkJob.id },
        data: { processedItems: Math.min(i + BATCH_SIZE, groupList.length) },
      });
    }

    await prisma.bulkJob.update({
      where: { id: bulkJob.id },
      data: {
        status: "COMPLETED",
        successCount,
        errorCount,
        skippedCount,
        resultSummary: JSON.stringify({ successCount, errorCount, skippedCount, errors: errors.slice(0, 200) }),
        completedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.BULK_IMPORT,
      entity: AUDIT_ENTITIES.PRODUCT,
      entityId: bulkJob.id,
      newData: { successCount, errorCount, skippedCount, mode },
    });

    invalidateCache("products:");

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        bulkJobId: bulkJob.id,
        successCount,
        errorCount,
        skippedCount,
        errors,
      },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Bulk upload failed",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products/bulk-upload",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Bulk upload failed" },
      { status: 500 }
    );
  }
}

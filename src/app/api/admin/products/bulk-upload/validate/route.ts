import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateBulkProductRows, type CsvRow } from "@/lib/utils/csv-parser";
import { logError } from "@/lib/error-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: CsvRow[] = body.rows ?? [];

    const structural = validateBulkProductRows(rows);

    const [existingSkus, existingCategories] = await Promise.all([
      prisma.product.findMany({ select: { sku: true } }),
      prisma.category.findMany({ select: { slug: true } }),
    ]);
    const skuSet = new Set(existingSkus.map((p) => p.sku.toUpperCase()));
    const categorySlugSet = new Set(existingCategories.map((c) => c.slug));

    const enrichedInvalid = [...structural.invalid];
    const enrichedWarnings = [...structural.warnings];

    structural.valid.forEach((row) => {
      const rowNum = rows.indexOf(row) + 2;

      if (row.category_slugs) {
        const slugs = row.category_slugs.split(",").map((s) => s.trim()).filter(Boolean);
        const missing = slugs.filter((s) => !categorySlugSet.has(s));
        if (missing.length > 0) {
          enrichedWarnings.push({
            row: rowNum,
            message: `Unknown category slug(s): ${missing.join(", ")}`,
          });
        }
      }

      if (skuSet.has(row.sku.trim().toUpperCase())) {
        enrichedWarnings.push({
          row: rowNum,
          message: `SKU "${row.sku}" already exists — will be updated depending on import mode`,
        });
      }
    });

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        validCount: structural.valid.length,
        invalidCount: enrichedInvalid.length,
        warningCount: enrichedWarnings.length,
        total: rows.length,
        valid: structural.valid,
        invalid: enrichedInvalid,
        warnings: enrichedWarnings,
      },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Bulk validation failed",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products/bulk-upload/validate",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to validate rows" },
      { status: 500 }
    );
  }
}

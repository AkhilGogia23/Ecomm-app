import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";
import type { CsvRow } from "@/lib/utils/csv-parser";

export async function POST(req: NextRequest) {
  const session = await auth();

  try {
    const body = await req.json();
    const rows: CsvRow[] = body.rows ?? [];

    const variants = await prisma.productVariant.findMany({ select: { id: true, sku: true, stock: true } });
    const variantBySku = new Map(variants.map((v) => [v.sku.toUpperCase(), v]));

    let successCount = 0;
    let errorCount = 0;
    const errors: { row: number; field: string; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const sku = row.variant_sku?.trim().toUpperCase();
      const newStock = Number(row.new_stock);

      const variant = sku ? variantBySku.get(sku) : undefined;
      if (!variant) {
        errors.push({ row: rowNum, field: "variant_sku", message: `Unknown SKU: ${row.variant_sku}` });
        errorCount += 1;
        continue;
      }
      if (Number.isNaN(newStock) || newStock < 0) {
        errors.push({ row: rowNum, field: "new_stock", message: "Invalid stock value" });
        errorCount += 1;
        continue;
      }

      await prisma.$transaction([
        prisma.productVariant.update({ where: { id: variant.id }, data: { stock: newStock } }),
        prisma.stockAdjustment.create({
          data: {
            variantId: variant.id,
            previousStock: variant.stock,
            newStock,
            adjustmentQty: newStock - variant.stock,
            reason: row.reason || "Bulk CSV update",
            adjustedById: session?.user?.id ?? "",
          },
        }),
      ]);

      successCount += 1;
    }

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.BULK_IMPORT,
      entity: AUDIT_ENTITIES.INVENTORY,
      newData: { successCount, errorCount },
    });

    return NextResponse.json({ success: true, error: null, data: { successCount, errorCount, errors } });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Bulk inventory update failed",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/inventory/bulk",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Bulk inventory update failed" }, { status: 500 });
  }
}

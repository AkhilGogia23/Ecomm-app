import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ variantId: string }> }) {
  try {
    const { variantId } = await params;
    const session = await auth();

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) {
      return NextResponse.json({ success: false, data: null, error: "Variant not found" }, { status: 404 });
    }

    const body = await req.json();
    const newStock = Number(body.newStock);
    const reason = String(body.reason ?? "Manual adjustment");

    if (Number.isNaN(newStock) || newStock < 0) {
      return NextResponse.json({ success: false, data: null, error: "Invalid stock value" }, { status: 400 });
    }

    const [updated] = await prisma.$transaction([
      prisma.productVariant.update({ where: { id: variantId }, data: { stock: newStock } }),
      prisma.stockAdjustment.create({
        data: {
          variantId,
          previousStock: variant.stock,
          newStock,
          adjustmentQty: newStock - variant.stock,
          reason,
          adjustedById: session?.user?.id ?? "",
        },
      }),
    ]);

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.INVENTORY,
      entityId: variantId,
      previousData: { stock: variant.stock },
      newData: { stock: newStock, reason },
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update stock",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/inventory/[variantId]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update stock" }, { status: 500 });
  }
}

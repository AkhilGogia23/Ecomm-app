import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupon = await prisma.coupon.findUnique({ where: { id } });

  if (!coupon) {
    return NextResponse.json({ success: false, data: null, error: "Coupon not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: coupon, error: null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Coupon not found" }, { status: 404 });
    }

    const body = await req.json();

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.value !== undefined ? { value: body.value } : {}),
        ...(body.minOrderAmount !== undefined ? { minOrderAmount: body.minOrderAmount } : {}),
        ...(body.maxDiscountAmount !== undefined ? { maxDiscountAmount: body.maxDiscountAmount } : {}),
        ...(body.usageLimit !== undefined ? { usageLimit: body.usageLimit } : {}),
        ...(body.perUserLimit !== undefined ? { perUserLimit: body.perUserLimit } : {}),
        ...(body.applicableCategories !== undefined
          ? { applicableCategories: JSON.stringify(body.applicableCategories) }
          : {}),
        ...(body.applicableProducts !== undefined
          ? { applicableProducts: JSON.stringify(body.applicableProducts) }
          : {}),
        ...(body.startDate !== undefined ? { startDate: body.startDate ? new Date(body.startDate) : null } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.COUPON,
      entityId: id,
      previousData: { isActive: existing.isActive, value: existing.value },
      newData: { isActive: updated.isActive, value: updated.value },
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update coupon",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/coupons/[id]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update coupon" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Coupon not found" }, { status: 404 });
    }

    await prisma.coupon.delete({ where: { id } });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.COUPON,
      entityId: id,
      previousData: { code: existing.code },
    });

    return NextResponse.json({ success: true, data: { id }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete coupon",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/coupons/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to delete coupon" }, { status: 500 });
  }
}

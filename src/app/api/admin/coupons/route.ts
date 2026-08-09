import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { couponSchema } from "@/lib/validators/common";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function GET() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { usages: true } } },
  });

  return NextResponse.json({ success: true, data: coupons, error: null });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const parsed = couponSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const code = input.code.trim().toUpperCase();

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ success: false, data: null, error: "Coupon code already exists" }, { status: 409 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: input.description,
        type: input.type,
        value: input.value,
        minOrderAmount: input.minOrderAmount,
        maxDiscountAmount: input.maxDiscountAmount,
        usageLimit: input.usageLimit,
        perUserLimit: input.perUserLimit,
        applicableCategories: input.applicableCategories ? JSON.stringify(input.applicableCategories) : undefined,
        applicableProducts: input.applicableProducts ? JSON.stringify(input.applicableProducts) : undefined,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive,
      },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.COUPON,
      entityId: coupon.id,
      newData: { code: coupon.code, type: coupon.type, value: coupon.value },
    });

    return NextResponse.json({ success: true, data: coupon, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to create coupon",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/coupons",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to create coupon" }, { status: 500 });
  }
}

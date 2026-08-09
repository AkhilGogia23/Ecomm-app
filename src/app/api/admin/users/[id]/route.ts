import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "User not found" }, { status: 404 });
    }

    const body = await req.json();

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.USER,
      entityId: id,
      previousData: { role: existing.role, isActive: existing.isActive },
      newData: { role: updated.role, isActive: updated.isActive },
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update user",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/users/[id]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update user" }, { status: 500 });
  }
}

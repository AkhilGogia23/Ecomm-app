import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Banner not found" }, { status: 404 });
    }

    const body = await req.json();

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.subtitle !== undefined ? { subtitle: body.subtitle } : {}),
        ...(body.imagePath !== undefined ? { imagePath: body.imagePath } : {}),
        ...(body.mobileImagePath !== undefined ? { mobileImagePath: body.mobileImagePath } : {}),
        ...(body.link !== undefined ? { link: body.link } : {}),
        ...(body.position !== undefined ? { position: body.position } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.startDate !== undefined ? { startDate: body.startDate ? new Date(body.startDate) : null } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
      },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.BANNER,
      entityId: id,
      previousData: { title: existing.title, isActive: existing.isActive },
      newData: { title: updated.title, isActive: updated.isActive },
    });

    invalidateCache("banners:");

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update banner",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/banners/[id]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update banner" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Banner not found" }, { status: 404 });
    }

    await prisma.banner.delete({ where: { id } });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.BANNER,
      entityId: id,
      previousData: { title: existing.title },
    });

    invalidateCache("banners:");

    return NextResponse.json({ success: true, data: { id }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete banner",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/banners/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to delete banner" }, { status: 500 });
  }
}

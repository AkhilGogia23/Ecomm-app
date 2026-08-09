import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.navMenuItem.update({
      where: { id },
      data: {
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId || null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });

    invalidateCache("navigation:");

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update nav item",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/navigation/[id]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update nav item" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.navMenuItem.delete({ where: { id } });

    invalidateCache("navigation:");

    return NextResponse.json({ success: true, data: { id }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete nav item",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/navigation/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to delete nav item" }, { status: 500 });
  }
}

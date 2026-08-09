import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      products: { include: { product: { select: { id: true, title: true, sku: true, basePrice: true } } } },
    },
  });

  if (!collection) {
    return NextResponse.json({ success: false, data: null, error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: collection, error: null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Collection not found" }, { status: 404 });
    }

    const body = await req.json();

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.imagePath !== undefined ? { imagePath: body.imagePath } : {}),
        ...(body.bannerImagePath !== undefined ? { bannerImagePath: body.bannerImagePath } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
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
      entity: AUDIT_ENTITIES.COLLECTION,
      entityId: id,
      previousData: { name: existing.name, isActive: existing.isActive },
      newData: { name: updated.name, isActive: updated.isActive },
    });

    invalidateCache("collections:");

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update collection",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/collections/[id]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update collection" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Collection not found" }, { status: 404 });
    }

    await prisma.collection.delete({ where: { id } });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.COLLECTION,
      entityId: id,
      previousData: { name: existing.name },
    });

    invalidateCache("collections:");

    return NextResponse.json({ success: true, data: { id }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete collection",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/collections/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to delete collection" }, { status: 500 });
  }
}

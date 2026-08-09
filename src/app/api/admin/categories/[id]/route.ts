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

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Category not found" }, { status: 404 });
    }

    const body = await req.json();

    let level = existing.level;
    if (body.parentId !== undefined) {
      if (body.parentId === id) {
        return NextResponse.json(
          { success: false, data: null, error: "A category cannot be its own parent" },
          { status: 400 }
        );
      }
      if (body.parentId) {
        const parent = await prisma.category.findUnique({ where: { id: body.parentId } });
        level = (parent?.level ?? 0) + 1;
      } else {
        level = 0;
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.imagePath !== undefined ? { imagePath: body.imagePath } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId || null, level } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.metaTitle !== undefined ? { metaTitle: body.metaTitle } : {}),
        ...(body.metaDescription !== undefined ? { metaDescription: body.metaDescription } : {}),
      },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.CATEGORY,
      entityId: id,
      previousData: { name: existing.name, isActive: existing.isActive },
      newData: { name: updated.name, isActive: updated.isActive },
    });

    invalidateCache("categories:");

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update category",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/categories/[id]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Category not found" }, { status: 404 });
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        { success: false, data: null, error: "Move or remove products from this category before deleting it" },
        { status: 409 }
      );
    }
    if (existing._count.children > 0) {
      return NextResponse.json(
        { success: false, data: null, error: "Move or delete subcategories before deleting this category" },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.CATEGORY,
      entityId: id,
      previousData: { name: existing.name },
    });

    invalidateCache("categories:");

    return NextResponse.json({ success: true, data: { id }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete category",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/categories/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to delete category" }, { status: 500 });
  }
}

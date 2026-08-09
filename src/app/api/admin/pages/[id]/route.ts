import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });

  if (!page) {
    return NextResponse.json({ success: false, data: null, error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: page, error: null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Page not found" }, { status: 404 });
    }

    const body = await req.json();

    const updated = await prisma.page.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.metaTitle !== undefined ? { metaTitle: body.metaTitle } : {}),
        ...(body.metaDescription !== undefined ? { metaDescription: body.metaDescription } : {}),
        ...(body.isPublished !== undefined ? { isPublished: body.isPublished } : {}),
      },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.PAGE,
      entityId: id,
      previousData: { title: existing.title, isPublished: existing.isPublished },
      newData: { title: updated.title, isPublished: updated.isPublished },
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update page",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/pages/[id]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update page" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Page not found" }, { status: 404 });
    }

    await prisma.page.delete({ where: { id } });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.PAGE,
      entityId: id,
      previousData: { title: existing.title },
    });

    return NextResponse.json({ success: true, data: { id }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete page",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/pages/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to delete page" }, { status: 500 });
  }
}

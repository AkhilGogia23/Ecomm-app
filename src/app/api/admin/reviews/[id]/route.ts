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

    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Review not found" }, { status: 404 });
    }

    const body = await req.json();
    const action = body.action as "approve" | "reject" | "reply" | undefined;

    const data: Record<string, unknown> = {};
    if (action === "approve") {
      data.isApproved = true;
      data.isRejected = false;
    } else if (action === "reject") {
      data.isApproved = false;
      data.isRejected = true;
    }
    if (body.adminReply !== undefined) {
      data.adminReply = body.adminReply;
      data.repliedAt = new Date();
    }

    const updated = await prisma.review.update({ where: { id }, data });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.REVIEW,
      entityId: id,
      previousData: { isApproved: existing.isApproved, isRejected: existing.isRejected },
      newData: { isApproved: updated.isApproved, isRejected: updated.isRejected },
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update review",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/reviews/[id]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Review not found" }, { status: 404 });
    }

    await prisma.review.delete({ where: { id } });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.REVIEW,
      entityId: id,
    });

    return NextResponse.json({ success: true, data: { id }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete review",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/reviews/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to delete review" }, { status: 500 });
  }
}

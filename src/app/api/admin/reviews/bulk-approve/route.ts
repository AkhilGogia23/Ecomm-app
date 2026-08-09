import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const ids: string[] = body.ids ?? [];

    await prisma.review.updateMany({
      where: { id: { in: ids } },
      data: { isApproved: true, isRejected: false },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.REVIEW,
      newData: { bulkApprovedCount: ids.length },
    });

    return NextResponse.json({ success: true, data: { count: ids.length }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to bulk approve reviews",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/reviews/bulk-approve",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to bulk approve reviews" }, { status: 500 });
  }
}

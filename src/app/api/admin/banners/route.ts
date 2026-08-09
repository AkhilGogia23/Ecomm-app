import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bannerSchema } from "@/lib/validators/common";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const position = req.nextUrl.searchParams.get("position");
  const banners = await prisma.banner.findMany({
    where: position ? { position } : undefined,
    orderBy: [{ position: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json({ success: true, data: banners, error: null });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const parsed = bannerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    if (!body.imagePath) {
      return NextResponse.json({ success: false, data: null, error: "Image is required" }, { status: 400 });
    }

    const input = parsed.data;
    const banner = await prisma.banner.create({
      data: {
        title: input.title,
        subtitle: input.subtitle,
        imagePath: body.imagePath,
        mobileImagePath: body.mobileImagePath || undefined,
        link: input.link,
        position: input.position,
        isActive: input.isActive,
        startDate: input.startDate,
        endDate: input.endDate,
        sortOrder: input.sortOrder,
      },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.BANNER,
      entityId: banner.id,
      newData: { title: banner.title, position: banner.position },
    });

    invalidateCache("banners:");

    return NextResponse.json({ success: true, data: banner, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to create banner",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/banners",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to create banner" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function GET() {
  const collections = await prisma.collection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({ success: true, data: collections, error: null });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ success: false, data: null, error: "Name is required" }, { status: 400 });
    }

    const slug = await generateUniqueSlug(name, async (s) => {
      const found = await prisma.collection.findUnique({ where: { slug: s } });
      return !!found;
    });

    const collection = await prisma.collection.create({
      data: {
        name,
        slug,
        description: body.description || undefined,
        imagePath: body.imagePath || undefined,
        bannerImagePath: body.bannerImagePath || undefined,
        type: body.type || "MANUAL",
        isActive: body.isActive ?? true,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.COLLECTION,
      entityId: collection.id,
      newData: { name: collection.name },
    });

    invalidateCache("collections:");

    return NextResponse.json({ success: true, data: collection, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to create collection",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/collections",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to create collection" }, { status: 500 });
  }
}

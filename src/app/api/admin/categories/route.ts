import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({ success: true, data: categories, error: null });
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
      const found = await prisma.category.findUnique({ where: { slug: s } });
      return !!found;
    });

    let level = 0;
    if (body.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: body.parentId } });
      level = (parent?.level ?? 0) + 1;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: body.description || undefined,
        imagePath: body.imagePath || undefined,
        parentId: body.parentId || undefined,
        level,
        isActive: body.isActive ?? true,
        metaTitle: body.metaTitle || undefined,
        metaDescription: body.metaDescription || undefined,
      },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.CATEGORY,
      entityId: category.id,
      newData: { name: category.name, slug: category.slug },
    });

    invalidateCache("categories:");

    return NextResponse.json({ success: true, data: category, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to create category",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/categories",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to create category" }, { status: 500 });
  }
}

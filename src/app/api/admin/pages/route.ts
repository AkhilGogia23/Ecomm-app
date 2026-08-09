import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pageSchema } from "@/lib/validators/common";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

export async function GET() {
  const pages = await prisma.page.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ success: true, data: pages, error: null });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const parsed = pageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const slug = input.slug?.trim()
      ? input.slug.trim()
      : await generateUniqueSlug(input.title, async (s) => {
          const found = await prisma.page.findUnique({ where: { slug: s } });
          return !!found;
        });

    const existingSlug = await prisma.page.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ success: false, data: null, error: "A page with this slug already exists" }, { status: 409 });
    }

    const page = await prisma.page.create({
      data: {
        title: input.title,
        slug,
        content: input.content,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        isPublished: input.isPublished,
      },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.PAGE,
      entityId: page.id,
      newData: { title: page.title, slug: page.slug },
    });

    return NextResponse.json({ success: true, data: page, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to create page",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/pages",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to create page" }, { status: 500 });
  }
}

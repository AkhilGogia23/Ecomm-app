import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils/slug";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ success: false, data: null, error: "Name is required" }, { status: 400 });
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: { name, slug: generateSlug(name) },
    });

    invalidateCache("products:");

    return NextResponse.json({ success: true, data: tag, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update tag",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/tags/[id]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update tag" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.tag.delete({ where: { id } });

    invalidateCache("products:");

    return NextResponse.json({ success: true, data: { id }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete tag",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/tags/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to delete tag" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const position = req.nextUrl.searchParams.get("position");
  const items = await prisma.navMenuItem.findMany({
    where: position ? { position } : undefined,
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ success: true, data: items, error: null });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const label = String(body.label ?? "").trim();
    const url = String(body.url ?? "").trim();

    if (!label || !url) {
      return NextResponse.json({ success: false, data: null, error: "Label and URL are required" }, { status: 400 });
    }

    const item = await prisma.navMenuItem.create({
      data: {
        label,
        url,
        parentId: body.parentId || undefined,
        position: body.position || "HEADER",
        isActive: body.isActive ?? true,
      },
    });

    invalidateCache("navigation:");

    return NextResponse.json({ success: true, data: item, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to create nav item",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/navigation",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to create nav item" }, { status: 500 });
  }
}

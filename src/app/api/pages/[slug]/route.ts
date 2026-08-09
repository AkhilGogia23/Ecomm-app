import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.page.findFirst({ where: { slug, isPublished: true } });

  if (!page) {
    return NextResponse.json({ success: false, data: null, error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: page, error: null });
}

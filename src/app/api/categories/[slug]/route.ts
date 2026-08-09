import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findFirst({
    where: { slug, isActive: true },
  });

  if (!category) {
    return NextResponse.json({ success: false, data: null, error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: category, error: null });
}

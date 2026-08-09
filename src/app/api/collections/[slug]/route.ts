import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await prisma.collection.findFirst({
    where: { slug, isActive: true },
  });

  if (!collection) {
    return NextResponse.json({ success: false, data: null, error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: collection, error: null });
}

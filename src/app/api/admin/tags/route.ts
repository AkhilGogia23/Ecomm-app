import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils/slug";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({ success: true, data: tags, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json(
      { success: false, data: null, error: "Tag name is required" },
      { status: 400 }
    );
  }

  const slug = generateSlug(name);
  const tag = await prisma.tag.upsert({
    where: { slug },
    update: {},
    create: { name, slug },
  });

  return NextResponse.json({ success: true, data: tag, error: null });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imagePath: true,
      parentId: true,
      level: true,
    },
  });

  return NextResponse.json({ success: true, data: categories, error: null });
}

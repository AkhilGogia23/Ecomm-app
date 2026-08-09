import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const position = req.nextUrl.searchParams.get("position") ?? "HERO";
  const now = new Date();

  const banners = await prisma.banner.findMany({
    where: {
      position,
      isActive: true,
      OR: [{ startDate: null }, { startDate: { lte: now } }],
    },
    orderBy: { sortOrder: "asc" },
  });

  const active = banners.filter((b) => !b.endDate || b.endDate >= now);

  return NextResponse.json({ success: true, data: active, error: null });
}

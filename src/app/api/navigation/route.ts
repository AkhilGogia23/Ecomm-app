import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const position = req.nextUrl.searchParams.get("position") ?? "HEADER";
  const items = await prisma.navMenuItem.findMany({
    where: { position, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ success: true, data: items, error: null });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceTagId, targetTagId } = body;

    if (!sourceTagId || !targetTagId || sourceTagId === targetTagId) {
      return NextResponse.json(
        { success: false, data: null, error: "Two distinct tags are required" },
        { status: 400 }
      );
    }

    const sourceLinks = await prisma.productTag.findMany({ where: { tagId: sourceTagId } });

    await prisma.$transaction(async (tx) => {
      for (const link of sourceLinks) {
        await tx.productTag.upsert({
          where: { productId_tagId: { productId: link.productId, tagId: targetTagId } },
          update: {},
          create: { productId: link.productId, tagId: targetTagId },
        });
      }
      await tx.productTag.deleteMany({ where: { tagId: sourceTagId } });
      await tx.tag.delete({ where: { id: sourceTagId } });
    });

    invalidateCache("products:");

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to merge tags",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/tags/merge",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to merge tags" }, { status: 500 });
  }
}

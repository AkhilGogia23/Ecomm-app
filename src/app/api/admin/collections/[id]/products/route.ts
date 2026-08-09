import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const productIds: string[] = body.productIds ?? [];

    const existing = await prisma.productCollection.findMany({
      where: { collectionId: id, productId: { in: productIds } },
      select: { productId: true },
    });
    const existingIds = new Set(existing.map((e) => e.productId));
    const newIds = productIds.filter((pid) => !existingIds.has(pid));

    if (newIds.length > 0) {
      await prisma.productCollection.createMany({
        data: newIds.map((productId) => ({ productId, collectionId: id })),
      });
    }

    invalidateCache("collections:");
    invalidateCache("products:");

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to add products to collection",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/collections/[id]/products",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to add products to collection" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const productId = req.nextUrl.searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ success: false, data: null, error: "productId is required" }, { status: 400 });
    }

    await prisma.productCollection.deleteMany({ where: { productId, collectionId: id } });

    invalidateCache("collections:");
    invalidateCache("products:");

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to remove product from collection",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/collections/[id]/products",
      method: "DELETE",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to remove product from collection" },
      { status: 500 }
    );
  }
}

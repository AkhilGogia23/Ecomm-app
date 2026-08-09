import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
      },
    },
  });

  return NextResponse.json({ success: true, data: items, error: null });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const productId = String(body.productId ?? "");
    if (!productId) {
      return NextResponse.json({ success: false, data: null, error: "productId is required" }, { status: 400 });
    }

    const item = await prisma.wishlist.upsert({
      where: { userId_productId: { userId: session.user.id, productId } },
      update: {},
      create: { userId: session.user.id, productId },
    });

    return NextResponse.json({ success: true, data: item, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to add to wishlist",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/wishlist",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to add to wishlist" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const productId = String(body.productId ?? "");

    await prisma.wishlist.deleteMany({ where: { userId: session.user.id, productId } });

    return NextResponse.json({ success: true, data: { productId }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to remove from wishlist",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/wishlist",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to remove from wishlist" }, { status: 500 });
  }
}

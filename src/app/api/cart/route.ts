import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
          variant: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: cart?.items ?? [], error: null });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const items: { productId: string; variantId: string | null; quantity: number }[] = body.items ?? [];

    const cart = await prisma.cart.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
    });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    if (items.length > 0) {
      await prisma.cartItem.createMany({
        data: items.map((i) => ({
          cartId: cart.id,
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      });
    }

    return NextResponse.json({ success: true, data: { count: items.length }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to save cart",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/cart",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to save cart" }, { status: 500 });
  }
}

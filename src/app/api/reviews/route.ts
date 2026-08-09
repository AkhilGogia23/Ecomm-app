import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validators/common";
import { logError } from "@/lib/error-logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { productId, rating, title, comment } = parsed.data;

    const existing = await prisma.review.findFirst({ where: { productId, userId: session.user.id } });
    if (existing) {
      return NextResponse.json(
        { success: false, data: null, error: "You have already reviewed this product" },
        { status: 409 }
      );
    }

    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { customerId: session.user.id, status: { in: ["DELIVERED", "CONFIRMED", "SHIPPED", "PROCESSING"] } },
      },
    });

    const review = await prisma.review.create({
      data: {
        productId,
        userId: session.user.id,
        rating,
        title,
        comment,
        isVerifiedPurchase: !!purchase,
      },
    });

    return NextResponse.json({ success: true, data: review, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to submit review",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/reviews",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to submit review" }, { status: 500 });
  }
}

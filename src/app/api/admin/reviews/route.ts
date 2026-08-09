import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const status = params.get("status") ?? "pending"; // pending | approved | rejected | all
    const rating = params.get("rating");
    const productId = params.get("productId");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");

    const where = {
      ...(status === "pending" ? { isApproved: false, isRejected: false } : {}),
      ...(status === "approved" ? { isApproved: true } : {}),
      ...(status === "rejected" ? { isRejected: true } : {}),
      ...(rating ? { rating: Number(rating) } : {}),
      ...(productId ? { productId } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, title: true } },
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: reviews, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load reviews",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/reviews",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load reviews" }, { status: 500 });
  }
}

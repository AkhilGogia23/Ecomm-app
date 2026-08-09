import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(req: NextRequest) {
  try {
    const variantId = req.nextUrl.searchParams.get("variantId");
    const userId = req.nextUrl.searchParams.get("userId");
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
    const limit = 50;

    const where = {
      ...(variantId ? { variantId } : {}),
      ...(userId ? { adjustedById: userId } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          variant: { select: { sku: true, size: true, color: true, product: { select: { title: true } } } },
          adjustedBy: { select: { name: true, email: true } },
        },
      }),
      prisma.stockAdjustment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      error: null,
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load inventory log",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/inventory/log",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load inventory log" }, { status: 500 });
  }
}

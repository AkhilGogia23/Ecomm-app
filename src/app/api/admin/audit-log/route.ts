import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const userId = params.get("userId");
    const action = params.get("action");
    const entity = params.get("entity");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const page = Math.max(1, Number(params.get("page") ?? "1"));
    const limit = 50;

    const where = {
      ...(userId ? { userId } : {}),
      ...(action ? { action } : {}),
      ...(entity ? { entity } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      error: null,
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load audit log",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/audit-log",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load audit log" }, { status: 500 });
  }
}

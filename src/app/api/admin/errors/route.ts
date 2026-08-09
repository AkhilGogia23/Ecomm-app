import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError, cleanOldErrors } from "@/lib/error-logger";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const level = params.get("level");
    const page = Math.max(1, Number(params.get("page") ?? "1"));
    const limit = 50;

    const where = level ? { level } : undefined;

    const [errors, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.errorLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      error: null,
      data: errors,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load error log",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/errors",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load error log" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const daysOld = Number(req.nextUrl.searchParams.get("daysOld") ?? "30");
    const count = await cleanOldErrors(daysOld);
    return NextResponse.json({ success: true, data: { count }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to clean up error log",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/errors",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to clean up error log" }, { status: 500 });
  }
}

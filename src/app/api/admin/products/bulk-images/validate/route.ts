import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchFilesToProducts } from "@/lib/utils/sku-matcher";
import { logError } from "@/lib/error-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filenames: string[] = body.filenames ?? [];

    const variants = await prisma.productVariant.findMany({
      select: { id: true, sku: true, productId: true },
    });

    const result = matchFilesToProducts(
      filenames.map((name) => ({ name })),
      variants
    );

    return NextResponse.json({ success: true, error: null, data: result });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to validate image filenames",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products/bulk-images/validate",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to validate filenames" },
      { status: 500 }
    );
  }
}

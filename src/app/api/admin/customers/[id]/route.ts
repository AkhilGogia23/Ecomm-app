import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const customer = await prisma.user.findFirst({
      where: { id, role: "CUSTOMER" },
      include: {
        orders: { orderBy: { createdAt: "desc" }, include: { items: { select: { id: true } } } },
        addresses: true,
        reviews: { include: { product: { select: { title: true } } }, orderBy: { createdAt: "desc" } },
        wishlistItems: { include: { product: { select: { id: true, title: true, basePrice: true, slug: true } } } },
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, data: null, error: "Customer not found" }, { status: 404 });
    }

    const { passwordHash: _passwordHash, ...safeCustomer } = customer;
    void _passwordHash;

    return NextResponse.json({ success: true, data: safeCustomer, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load customer",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/customers/[id]",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load customer" }, { status: 500 });
  }
}

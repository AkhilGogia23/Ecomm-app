import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.address.findFirst({ where: { id, userId: session.user.id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Address not found" }, { status: 404 });
    }

    const body = await req.json();

    if (body.isDefault) {
      await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.line1 !== undefined ? { line1: body.line1 } : {}),
        ...(body.line2 !== undefined ? { line2: body.line2 } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.state !== undefined ? { state: body.state } : {}),
        ...(body.postalCode !== undefined ? { postalCode: body.postalCode } : {}),
        ...(body.country !== undefined ? { country: body.country } : {}),
        ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update address",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/addresses/[id]",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update address" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.address.findFirst({ where: { id, userId: session.user.id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, error: "Address not found" }, { status: 404 });
    }

    await prisma.address.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete address",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/addresses/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to delete address" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validators/common";
import { logError } from "@/lib/error-logger";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, data: addresses, error: null });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const input = parsed.data;

    if (input.isDefault) {
      await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
    }

    const existingCount = await prisma.address.count({ where: { userId: session.user.id } });

    const address = await prisma.address.create({
      data: { ...input, userId: session.user.id, isDefault: input.isDefault || existingCount === 0 },
    });

    return NextResponse.json({ success: true, data: address, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to create address",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/addresses",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to create address" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSchema } from "@/lib/validators/user";
import { hashPassword } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { AUDIT_ACTIONS, AUDIT_ENTITIES, ADMIN_ROLES } from "@/lib/constants";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { role: { in: [...ADMIN_ROLES] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: users, error: null });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, data: null, error: "A user with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, emailVerified: true },
    });

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.USER,
      entityId: user.id,
      newData: { name: user.name, email: user.email, role: user.role },
    });

    return NextResponse.json(
      { success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role }, error: null },
      { status: 201 }
    );
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to create admin user",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/users",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to create admin user" }, { status: 500 });
  }
}

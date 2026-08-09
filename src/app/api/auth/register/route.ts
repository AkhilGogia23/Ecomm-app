import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";
import { registerSchema } from "@/lib/validators/user";
import { queueEmail } from "@/lib/email";
import { logError } from "@/lib/error-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, data: null, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    queueEmail({
      to: email,
      subject: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME ?? "our store"}, ${name}!`,
      html: `<div><h1>Welcome, ${name}!</h1><p>Thanks for creating an account with us.</p></div>`,
    });

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name },
      error: null,
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Registration failed",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/auth/register",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

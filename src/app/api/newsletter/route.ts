import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, data: null, error: "A valid email is required" }, { status: 400 });
    }

    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { isActive: true, unsubscribedAt: null },
      create: { email },
    });

    return NextResponse.json({ success: true, data: { email: subscriber.email }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to subscribe",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/newsletter",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to subscribe" }, { status: 500 });
  }
}

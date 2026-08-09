import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, data: null, error: "Name, email, subject, and message are required" },
        { status: 400 }
      );
    }

    const submission = await prisma.contactSubmission.create({
      data: { name, email, phone, subject, message },
    });

    return NextResponse.json({ success: true, data: { id: submission.id }, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to submit contact form",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/contact",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to submit contact form" }, { status: 500 });
  }
}

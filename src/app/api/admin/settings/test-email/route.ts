import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { logError } from "@/lib/error-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const to = String(body.to ?? "");

    if (!to) {
      return NextResponse.json({ success: false, data: null, error: "Recipient email is required" }, { status: 400 });
    }

    await sendEmail({
      to,
      subject: "Test email from your store",
      html: "<p>This is a test email to confirm your SMTP settings are working correctly.</p>",
    });

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to send test email",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/settings/test-email",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to send test email" }, { status: 500 });
  }
}

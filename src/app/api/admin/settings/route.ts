import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/constants";

const SENSITIVE_KEYS = new Set(["razorpay_key_secret", "smtp_pass"]);

export async function GET(req: NextRequest) {
  try {
    const group = req.nextUrl.searchParams.get("group");
    const settings = await prisma.siteSetting.findMany({
      where: group ? { group } : undefined,
    });

    const values: Record<string, unknown> = {};
    for (const s of settings) {
      let raw = s.value;
      if (SENSITIVE_KEYS.has(s.key)) {
        raw = JSON.stringify(decrypt(JSON.parse(s.value)) || "");
      }
      try {
        values[s.key] = JSON.parse(raw);
      } catch {
        values[s.key] = raw;
      }
      if (SENSITIVE_KEYS.has(s.key) && values[s.key]) {
        values[s.key] = "••••••••";
      }
    }

    return NextResponse.json({ success: true, data: values, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to load settings",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/settings",
      method: "GET",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { group, values } = body as { group: string; values: Record<string, unknown> };

    if (!group || !values) {
      return NextResponse.json({ success: false, data: null, error: "group and values are required" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(values)) {
      // Don't overwrite a sensitive value with the masked placeholder sent back from the UI
      if (SENSITIVE_KEYS.has(key) && value === "••••••••") continue;

      const storedValue = SENSITIVE_KEYS.has(key)
        ? JSON.stringify(encrypt(String(value ?? "")))
        : JSON.stringify(value);

      await prisma.siteSetting.upsert({
        where: { key },
        update: { value: storedValue, group, updatedById: session?.user?.id },
        create: { key, value: storedValue, group, updatedById: session?.user?.id },
      });
    }

    await createAuditLog({
      userId: session?.user?.id,
      userName: session?.user?.name,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.SETTING,
      entityId: group,
      newData: { group, keys: Object.keys(values) },
    });

    invalidateCache("settings:");

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to update settings",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/settings",
      method: "PUT",
    });
    return NextResponse.json({ success: false, data: null, error: "Failed to update settings" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PUBLIC_KEYS = [
  "store_name",
  "store_tagline",
  "store_email",
  "store_phone",
  "store_address",
  "currency_symbol",
  "announcement_text",
  "announcement_active",
  "social_instagram",
  "social_facebook",
  "social_twitter",
  "social_youtube",
  "social_whatsapp",
  "shipping_rules",
  "cod_enabled",
  "cod_limit",
  "default_tax_rate",
  "tax_included_in_price",
];

export async function GET() {
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: PUBLIC_KEYS } },
  });

  const values: Record<string, unknown> = {};
  for (const s of settings) {
    try {
      values[s.key] = JSON.parse(s.value);
    } catch {
      values[s.key] = s.value;
    }
  }

  return NextResponse.json({ success: true, data: values, error: null });
}

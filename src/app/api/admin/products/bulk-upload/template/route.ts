import { NextRequest, NextResponse } from "next/server";
import { generateCSVTemplate } from "@/lib/utils/csv-parser";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") === "inventory" ? "inventory" : "products";
  const csv = generateCSVTemplate(type);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-template.csv"`,
    },
  });
}

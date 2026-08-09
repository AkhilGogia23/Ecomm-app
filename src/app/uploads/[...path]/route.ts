import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { UPLOAD_ROOT } from "@/lib/file-storage";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  const relativePath = segments.join("/");
  const filePath = path.join(UPLOAD_ROOT, relativePath);

  const normalizedRoot = path.normalize(UPLOAD_ROOT);
  const normalizedTarget = path.normalize(filePath);
  if (!normalizedTarget.startsWith(normalizedRoot)) {
    return NextResponse.json({ success: false, data: null, error: "Invalid path" }, { status: 400 });
  }

  if (!fs.existsSync(normalizedTarget)) {
    return NextResponse.json({ success: false, data: null, error: "File not found" }, { status: 404 });
  }

  const ext = path.extname(normalizedTarget).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  const buffer = await fs.promises.readFile(normalizedTarget);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

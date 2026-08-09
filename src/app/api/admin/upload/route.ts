import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { validateImage, processImage } from "@/lib/image-processor";
import { ensureDirectory, UPLOAD_ROOT } from "@/lib/file-storage";
import { logError } from "@/lib/error-logger";

export const runtime = "nodejs";

const ALLOWED_DIRECTORIES = ["categories", "collections", "banners", "avatars", "pages"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const type = String(formData.get("type") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, data: null, error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_DIRECTORIES.includes(type)) {
      return NextResponse.json({ success: false, data: null, error: "Invalid upload type" }, { status: 400 });
    }

    const validation = validateImage({ type: file.type, size: file.size });
    if (!validation.valid) {
      return NextResponse.json({ success: false, data: null, error: validation.error }, { status: 400 });
    }

    const outputDir = path.join(UPLOAD_ROOT, type);
    ensureDirectory(outputDir);

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const processed = await processImage(buffer, outputDir, safeName);

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        path: `/uploads/${type}/${processed.original}`,
        thumbPath: `/uploads/${type}/${processed.thumb}`,
        mediumPath: `/uploads/${type}/${processed.medium}`,
        width: processed.width,
        height: processed.height,
      },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Upload failed",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/upload",
      method: "POST",
    });
    return NextResponse.json({ success: false, data: null, error: "Upload failed" }, { status: 500 });
  }
}

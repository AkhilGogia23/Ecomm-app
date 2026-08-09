import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { validateImage, processImage } from "@/lib/image-processor";
import { ensureDirectory, UPLOAD_ROOT } from "@/lib/file-storage";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";

export const runtime = "nodejs";

function deleteImageVariants(productId: string, filePath: string) {
  const dir = path.join(UPLOAD_ROOT, "products", productId);
  const originalName = path.basename(filePath);
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);

  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir)) {
    if (entry === originalName || entry.startsWith(`${base}-`)) {
      fs.unlinkSync(path.join(dir, entry));
    }
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ success: false, data: null, error: "No files provided" }, { status: 400 });
    }

    const outputDir = path.join(UPLOAD_ROOT, "products", id);
    ensureDirectory(outputDir);

    const existingCount = await prisma.productImage.count({ where: { productId: id } });
    const created = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateImage({ type: file.type, size: file.size });
      if (!validation.valid) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = `${Date.now()}-${i}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const processed = await processImage(buffer, outputDir, safeName);

      const position = existingCount + i;
      const image = await prisma.productImage.create({
        data: {
          productId: id,
          filePath: `/uploads/products/${id}/${processed.original}`,
          thumbPath: `/uploads/products/${id}/${processed.thumb}`,
          mediumPath: `/uploads/products/${id}/${processed.medium}`,
          webpPath: `/uploads/products/${id}/${processed.largeWebp}`,
          position,
          isThumbnail: position === 0,
          width: processed.width,
          height: processed.height,
          fileSize: buffer.length,
        },
      });
      created.push(image);
    }

    invalidateCache("products:");

    return NextResponse.json({ success: true, data: created, error: null }, { status: 201 });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to upload images",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products/[id]/images",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to upload images" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const order: { id: string; position: number }[] = body.order ?? [];

    await prisma.$transaction(
      order.map((item) =>
        prisma.productImage.updateMany({
          where: { id: item.id, productId: id },
          data: { position: item.position, isThumbnail: item.position === 0 },
        })
      )
    );

    invalidateCache("products:");

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to reorder images",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products/[id]/images",
      method: "PUT",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to reorder images" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const imageId = req.nextUrl.searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json({ success: false, data: null, error: "imageId is required" }, { status: 400 });
    }

    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId: id } });
    if (!image) {
      return NextResponse.json({ success: false, data: null, error: "Image not found" }, { status: 404 });
    }

    deleteImageVariants(id, image.filePath);

    await prisma.productImage.delete({ where: { id: imageId } });

    invalidateCache("products:");

    return NextResponse.json({ success: true, data: { id: imageId }, error: null });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Failed to delete image",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products/[id]/images",
      method: "DELETE",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { extractSkuFromFilename } from "@/lib/utils/sku-matcher";
import { validateImage, processImage } from "@/lib/image-processor";
import { ensureDirectory, UPLOAD_ROOT } from "@/lib/file-storage";
import { logError } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/cache";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    const manualAssignmentsRaw = formData.get("manualAssignments");
    const manualAssignments: Record<string, string> = manualAssignmentsRaw
      ? JSON.parse(manualAssignmentsRaw as string)
      : {};

    if (files.length === 0) {
      return NextResponse.json({ success: false, data: null, error: "No files provided" }, { status: 400 });
    }

    const variants = await prisma.productVariant.findMany({
      select: { id: true, sku: true, productId: true },
    });
    const variantBySku = new Map(variants.map((v) => [v.sku.toUpperCase(), v]));
    const variantById = new Map(variants.map((v) => [v.id, v]));

    let uploaded = 0;
    let failed = 0;
    const unmatched: string[] = [];
    const failedFiles: string[] = [];

    for (const file of files) {
      const extracted = extractSkuFromFilename(file.name);
      const manualVariantId = manualAssignments[file.name];
      const variant = manualVariantId
        ? variantById.get(manualVariantId)
        : extracted.valid
          ? variantBySku.get(extracted.sku)
          : undefined;

      if (!variant) {
        unmatched.push(file.name);
        continue;
      }

      const validation = validateImage({ type: file.type, size: file.size });
      if (!validation.valid) {
        failed += 1;
        failedFiles.push(file.name);
        continue;
      }

      try {
        const outputDir = path.join(UPLOAD_ROOT, "products", variant.productId);
        ensureDirectory(outputDir);

        const buffer = Buffer.from(await file.arrayBuffer());
        const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const processed = await processImage(buffer, outputDir, safeName);

        const existingCount = await prisma.productImage.count({ where: { productId: variant.productId } });

        await prisma.productImage.create({
          data: {
            productId: variant.productId,
            variantId: variant.id,
            filePath: `/uploads/products/${variant.productId}/${processed.original}`,
            thumbPath: `/uploads/products/${variant.productId}/${processed.thumb}`,
            mediumPath: `/uploads/products/${variant.productId}/${processed.medium}`,
            webpPath: `/uploads/products/${variant.productId}/${processed.largeWebp}`,
            position: extracted.position || existingCount,
            isThumbnail: existingCount === 0,
            width: processed.width,
            height: processed.height,
            fileSize: buffer.length,
          },
        });

        uploaded += 1;
      } catch {
        failed += 1;
        failedFiles.push(file.name);
      }
    }

    invalidateCache("products:");

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        matched: files.length - unmatched.length,
        uploaded,
        failed,
        unmatched,
        failedFiles,
      },
    });
  } catch (err) {
    await logError({
      message: err instanceof Error ? err.message : "Bulk image upload failed",
      stack: err instanceof Error ? err.stack : undefined,
      endpoint: "/api/admin/products/bulk-images",
      method: "POST",
    });
    return NextResponse.json(
      { success: false, data: null, error: "Bulk image upload failed" },
      { status: 500 }
    );
  }
}

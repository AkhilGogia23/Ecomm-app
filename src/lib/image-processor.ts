import sharp from "sharp";
import path from "path";
import fs from "fs";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB = Number(process.env.MAX_IMAGE_SIZE_MB || "5");

export interface ProcessedImagePaths {
  original: string;
  large: string;
  medium: string;
  thumb: string;
  largeWebp: string;
  mediumWebp: string;
  thumbWebp: string;
  width: number;
  height: number;
}

export interface ValidateResult {
  valid: boolean;
  error?: string;
}

export function validateImage(file: {
  type: string;
  size: number;
}): ValidateResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Only JPG, PNG and WebP images are allowed" };
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `Image must be smaller than ${MAX_SIZE_MB}MB` };
  }
  return { valid: true };
}

export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

export async function processImage(
  inputBuffer: Buffer,
  outputDir: string,
  filename: string
): Promise<ProcessedImagePaths> {
  fs.mkdirSync(outputDir, { recursive: true });

  const ext = path.extname(filename) || ".jpg";
  const base = path.basename(filename, ext);

  const originalName = `${base}${ext}`;
  const largeName = `${base}-large${ext}`;
  const mediumName = `${base}-medium${ext}`;
  const thumbName = `${base}-thumb${ext}`;
  const largeWebpName = `${base}-large.webp`;
  const mediumWebpName = `${base}-medium.webp`;
  const thumbWebpName = `${base}-thumb.webp`;

  const meta = await sharp(inputBuffer).metadata();

  await fs.promises.writeFile(path.join(outputDir, originalName), inputBuffer);

  await sharp(inputBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(path.join(outputDir, largeName));

  await sharp(inputBuffer)
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(path.join(outputDir, mediumName));

  await sharp(inputBuffer)
    .resize({ width: 400, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toFile(path.join(outputDir, thumbName));

  await sharp(inputBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(path.join(outputDir, largeWebpName));

  await sharp(inputBuffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(outputDir, mediumWebpName));

  await sharp(inputBuffer)
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(path.join(outputDir, thumbWebpName));

  return {
    original: originalName,
    large: largeName,
    medium: mediumName,
    thumb: thumbName,
    largeWebp: largeWebpName,
    mediumWebp: mediumWebpName,
    thumbWebp: thumbWebpName,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

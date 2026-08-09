import fs from "fs";
import path from "path";

const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./data/uploads");

export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getUploadPath(type: string, id: string): string {
  return path.join(UPLOAD_ROOT, type, id);
}

export async function saveFile(
  buffer: Buffer,
  directory: string,
  filename: string
): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, directory);
  ensureDirectory(dir);
  const fullPath = path.join(dir, filename);
  await fs.promises.writeFile(fullPath, buffer);
  return fullPath;
}

export function deleteFile(filePath: string): void {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(UPLOAD_ROOT, filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export function deleteDirectory(dirPath: string): void {
  const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(UPLOAD_ROOT, dirPath);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

export { UPLOAD_ROOT };

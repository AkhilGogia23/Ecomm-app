import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ROLE_PERMISSIONS, type UserRole } from "./constants";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function checkPermission(
  userRole: string,
  requiredModule: string
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole as UserRole];
  if (!permissions) return false;
  if (permissions.includes("*")) return true;
  if (permissions.includes(requiredModule)) return true;

  const [moduleBase] = requiredModule.split(":");
  return permissions.some((p) => p === moduleBase || p.startsWith(`${moduleBase}:`));
}

export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

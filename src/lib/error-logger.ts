import { prisma } from "./prisma";
import { sanitizeRequestBody } from "./utils/sanitize";

interface LogErrorInput {
  level?: "ERROR" | "WARN" | "INFO";
  message: string;
  stack?: string | null;
  endpoint?: string | null;
  method?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  requestBody?: Record<string, unknown> | null;
}

export async function logError(input: LogErrorInput): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        level: input.level ?? "ERROR",
        message: input.message,
        stack: input.stack ?? null,
        endpoint: input.endpoint ?? null,
        method: input.method ?? null,
        userId: input.userId ?? null,
        ipAddress: input.ipAddress ?? null,
        requestBody: input.requestBody
          ? JSON.stringify(sanitizeRequestBody(input.requestBody))
          : null,
      },
    });
  } catch (err) {
    console.error("Failed to log error:", err);
  }
}

export async function cleanOldErrors(daysOld: number): Promise<number> {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const result = await prisma.errorLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}

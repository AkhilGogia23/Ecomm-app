import { prisma } from "./prisma";

interface CreateAuditLogInput {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function diffData(
  previous: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined
): { prev: Record<string, unknown>; curr: Record<string, unknown> } {
  if (!previous || !next) {
    return { prev: previous ?? {}, curr: next ?? {} };
  }

  const prev: Record<string, unknown> = {};
  const curr: Record<string, unknown> = {};

  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(next[key])) {
      prev[key] = previous[key];
      curr[key] = next[key];
    }
  }

  return { prev, curr };
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  const { prev, curr } = diffData(input.previousData, input.newData);

  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      userName: input.userName ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      previousData: input.previousData ? JSON.stringify(prev) : null,
      newData: input.newData ? JSON.stringify(curr) : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

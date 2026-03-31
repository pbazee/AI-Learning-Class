import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditPayload = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function createAuditLog({
  actorId,
  action,
  entityType,
  entityId,
  summary,
  metadata,
}: AuditPayload) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? undefined,
        action,
        entityType,
        entityId: entityId ?? undefined,
        summary: summary ?? undefined,
        metadata,
      },
    });
  } catch (error) {
    console.error("[audit] Failed to record audit event.", error);
  }
}

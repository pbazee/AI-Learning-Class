import "server-only";

import { Prisma } from "@prisma/client";

const TRANSIENT_PRISMA_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
  "P2028",
  "P2034",
]);
const SCHEMA_MISMATCH_PRISMA_CODES = new Set(["P2021", "P2022"]);
const DEFAULT_LOG_COOLDOWN_MS = Math.max(
  1_000,
  Number.parseInt(process.env.PRISMA_LOG_COOLDOWN_MS ?? "60000", 10)
);

const globalForPrismaErrors = globalThis as typeof globalThis & {
  prismaLogCache?: Map<string, number>;
};

function shouldLogPrismaEvent(key: string) {
  const now = Date.now();
  const logCache = globalForPrismaErrors.prismaLogCache ?? new Map<string, number>();
  const lastLoggedAt = logCache.get(key) ?? 0;

  if (now - lastLoggedAt < DEFAULT_LOG_COOLDOWN_MS) {
    return false;
  }

  logCache.set(key, now);
  globalForPrismaErrors.prismaLogCache = logCache;
  return true;
}

export function isPrismaConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code);
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return [
    "can't reach database server",
    "connection closed",
    "connection reset",
    "connection terminated unexpectedly",
    "connection pool timeout",
    "prepared statement",
    "server closed the connection unexpectedly",
    "timed out fetching a new connection",
    "the database system is starting up",
    "transaction api error",
    "unable to start a transaction in the given time",
    "transaction already closed",
    "transaction was already closed",
  ].some((fragment) => message.includes(fragment));
}

export function isPrismaSchemaMismatchError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    SCHEMA_MISMATCH_PRISMA_CODES.has(error.code)
  );
}

export function logPrismaConnectionEvent(
  key: string,
  message: string,
  error: unknown,
  level: "warn" | "error" = "warn"
) {
  if (!shouldLogPrismaEvent(key)) {
    return;
  }

  const log = level === "error" ? console.error : console.warn;
  log(message, error);
}

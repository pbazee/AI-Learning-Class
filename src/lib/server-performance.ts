import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "@/lib/config";
import { logger } from "@/lib/logger";

type RequestPerformanceContext = {
  requestId: string;
  label: string;
  startedAt: number;
  databaseTimeMs: number;
  databaseQueryCount: number;
};

const requestPerformanceStorage =
  new AsyncLocalStorage<RequestPerformanceContext>();

const PERF_LOGGING_ENABLED = env.NODE_ENV !== "production" || env.ENABLE_PERF_LOGS === "1";
const SLOW_QUERY_THRESHOLD_MS = Math.max(
  10,
  Number.parseInt(env.SLOW_QUERY_THRESHOLD_MS ?? "250", 10)
);

function nowMs() {
  return performance.now();
}

function formatDuration(value: number) {
  return Number(value.toFixed(1));
}

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function recordDatabaseQueryTiming(label: string, durationMs: number) {
  const context = requestPerformanceStorage.getStore();

  if (context) {
    context.databaseTimeMs += durationMs;
    context.databaseQueryCount += 1;
  }

  if (PERF_LOGGING_ENABLED && durationMs >= SLOW_QUERY_THRESHOLD_MS) {
    logger.info(`[perf.db] ${label} took ${formatDuration(durationMs)}ms${context ? ` request=${context.requestId}` : ""}`);
  }
}

function attachServerTimingHeader(response: Response, context: RequestPerformanceContext) {
  const totalDuration = nowMs() - context.startedAt;
  response.headers.set(
    "Server-Timing",
    `db;dur=${formatDuration(context.databaseTimeMs)}, total;dur=${formatDuration(totalDuration)}`
  );
  response.headers.set("x-request-id", context.requestId);
}

export async function withRequestTiming<T>(
  label: string,
  operation: () => Promise<T>
) {
  const context: RequestPerformanceContext = {
    requestId: createRequestId(),
    label,
    startedAt: nowMs(),
    databaseTimeMs: 0,
    databaseQueryCount: 0,
  };

  return requestPerformanceStorage.run(context, async () => {
    try {
      const result = await operation();

      if (result instanceof Response) {
        attachServerTimingHeader(result, context);
      }

      return result;
    } finally {
      if (PERF_LOGGING_ENABLED) {
        const totalDuration = nowMs() - context.startedAt;
        logger.info(`[perf.request] ${context.label} total=${formatDuration(totalDuration)}ms db=${formatDuration(context.databaseTimeMs)}ms queries=${context.databaseQueryCount} request=${context.requestId}`);
      }
    }
  });
}

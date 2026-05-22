import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/config";

type MemoryBucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

type RateLimitUnit = "ms" | "s" | "m" | "h" | "d";
type RateLimitWindow = `${number} ${RateLimitUnit}`;

function parseUpstashWindow(window: RateLimitWindow) {
  return window as Parameters<typeof Ratelimit.slidingWindow>[1];
}

function parseWindow(window: RateLimitWindow) {
  const [count, unit] = window.split(" ") as [string, RateLimitUnit];
  const value = Number.parseInt(count, 10);
  const unitToMs: Record<RateLimitUnit, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return value * unitToMs[unit];
}

function createFallbackLimiter(limit: number, window: RateLimitWindow, prefix: string) {
  const windowMs = parseWindow(window);

  return {
    async limit(identifier: string) {
      const key = `${prefix}:${identifier}`;
      const now = Date.now();
      const bucket = memoryBuckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        memoryBuckets.set(key, {
          count: 1,
          resetAt: now + windowMs,
        });

        return { success: true };
      }

      if (bucket.count >= limit) {
        return { success: false };
      }

      bucket.count += 1;
      memoryBuckets.set(key, bucket);
      return { success: true };
    },
  };
}

function createLimiter(limit: number, window: RateLimitWindow, prefix: string) {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, parseUpstashWindow(window)),
      prefix,
    });
  }

  return createFallbackLimiter(limit, window, prefix);
}

export const authRatelimit = createLimiter(5, "1 m", "rl:auth");

export const uploadRatelimit = createLimiter(20, "1 m", "rl:upload");

export async function checkRateLimit(
  limiter: { limit: (identifier: string) => Promise<{ success: boolean }> },
  identifier: string
): Promise<Response | null> {
  const { success } = await limiter.limit(identifier);

  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }

  return null;
}

import { z } from "zod";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default(process.env.NODE_ENV as any ?? "development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default(process.env.NEXT_PUBLIC_APP_URL ?? APP_URL),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),

  // Supabase (public keys are optional for server; service role is server-only)
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: z.string().optional(),

  // Cloudflare
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_STREAM_API_TOKEN: z.string().optional(),

  // Cloudflare R2
  CLOUDFLARE_R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // Admin
  ADMIN_EMAIL: z.string().email().optional(),

  // Database
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  DATABASE_SSL_MODE: z.string().optional(),
  DATABASE_CA_CERT: z.string().optional(),

  // Payments
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_MODE: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Emails / third-party
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Revalidation / caching
  PUBLIC_PAGE_REVALIDATE_SECONDS: z.string().optional(),
  POPUP_DATA_REVALIDATE_SECONDS: z.string().optional(),
  CERTIFICATE_PDF_CACHE_REVALIDATE_SECONDS: z.string().optional(),

  // Runtime flags
  ENABLE_PERF_LOGS: z.string().optional(),
  SLOW_QUERY_THRESHOLD_MS: z.string().optional(),

  // AI / OpenAI / Anthropic
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_ASK_AI_MODEL: z.string().optional(),
  OPENAI_COPILOT_MODEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Prisma tuning
  PRISMA_MAX_ATTEMPTS: z.string().optional(),
  PRISMA_RETRY_DELAY_MS: z.string().optional(),
  PRISMA_TRANSACTION_MAX_WAIT_MS: z.string().optional(),
  PRISMA_TRANSACTION_TIMEOUT_MS: z.string().optional(),
  PRISMA_LOG_COOLDOWN_MS: z.string().optional(),
});

const raw = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_STREAM_API_TOKEN: process.env.CLOUDFLARE_STREAM_API_TOKEN,
  CLOUDFLARE_R2_ENDPOINT: process.env.CLOUDFLARE_R2_ENDPOINT,
  R2_ACCESS_KEY_ID:
    process.env.R2_ACCESS_KEY_ID ?? process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY:
    process.env.R2_SECRET_ACCESS_KEY ??
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME:
    process.env.R2_BUCKET_NAME ?? process.env.CLOUDFLARE_R2_BUCKET_NAME,
  R2_PUBLIC_URL:
    process.env.R2_PUBLIC_URL ?? process.env.CLOUDFLARE_R2_PUBLIC_URL,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  DATABASE_SSL_MODE: process.env.DATABASE_SSL_MODE,
  DATABASE_CA_CERT: process.env.DATABASE_CA_CERT,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  SENTRY_DSN: process.env.SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  PUBLIC_PAGE_REVALIDATE_SECONDS: process.env.PUBLIC_PAGE_REVALIDATE_SECONDS,
  POPUP_DATA_REVALIDATE_SECONDS: process.env.POPUP_DATA_REVALIDATE_SECONDS,
  CERTIFICATE_PDF_CACHE_REVALIDATE_SECONDS: process.env.CERTIFICATE_PDF_CACHE_REVALIDATE_SECONDS,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_ASK_AI_MODEL: process.env.OPENAI_ASK_AI_MODEL,
  OPENAI_COPILOT_MODEL: process.env.OPENAI_COPILOT_MODEL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  PRISMA_MAX_ATTEMPTS: process.env.PRISMA_MAX_ATTEMPTS,
  PRISMA_RETRY_DELAY_MS: process.env.PRISMA_RETRY_DELAY_MS,
  PRISMA_TRANSACTION_MAX_WAIT_MS: process.env.PRISMA_TRANSACTION_MAX_WAIT_MS,
  PRISMA_TRANSACTION_TIMEOUT_MS: process.env.PRISMA_TRANSACTION_TIMEOUT_MS,
  PRISMA_LOG_COOLDOWN_MS: process.env.PRISMA_LOG_COOLDOWN_MS,
};

export const env = EnvSchema.parse(raw);

// Helper to assert production-critical keys are present. Throws if missing.
export function assertProductionReady() {
  if (env.NODE_ENV !== "production") return;

  const required = [
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missing = required.filter((k) => !(env as any)[k]);
  if (missing.length) {
    throw new Error(`Missing required env vars for production: ${missing.join(", ")}`);
  }
}

// Convenience numeric parsing for Prisma tuning
export const prismaConfig = {
  maxAttempts: Math.max(1, Number.parseInt(process.env.PRISMA_MAX_ATTEMPTS ?? "3", 10)),
  retryDelayMs: Math.max(150, Number.parseInt(process.env.PRISMA_RETRY_DELAY_MS ?? "350", 10)),
  transactionMaxWaitMs: Math.max(5_000, Number.parseInt(process.env.PRISMA_TRANSACTION_MAX_WAIT_MS ?? "20000", 10)),
  transactionTimeoutMs: Math.max(
    Number.parseInt(process.env.PRISMA_TRANSACTION_MAX_WAIT_MS ?? "20000", 10),
    Number.parseInt(process.env.PRISMA_TRANSACTION_TIMEOUT_MS ?? "45000", 10)
  ),
};

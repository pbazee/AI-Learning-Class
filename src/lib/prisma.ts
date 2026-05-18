import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const MISSING_DATABASE_URL_MESSAGE =
  "No database host or connection string was set. Set DATABASE_URL for this runtime.";

function normalizeDatabaseUrl(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const isSupabaseTransactionPooler =
      url.protocol.startsWith("postgres") &&
      url.port === "6543" &&
      url.hostname.startsWith("db.") &&
      url.hostname.endsWith(".supabase.co");
    const isSupabaseSessionPooler = url.hostname.includes("pooler.supabase.com");

    if (isSupabaseTransactionPooler || isSupabaseSessionPooler) {
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
    }

    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "10");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "10");
    }
    if (!url.searchParams.has("socket_timeout")) {
      url.searchParams.set("socket_timeout", "10");
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

function normalizeMultilineSecret(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.replace(/\\n/g, "\n").trim();
}

function buildPoolConfig(connectionString: string): PoolConfig {
  const normalizedConnectionString = normalizeDatabaseUrl(connectionString);
  const ca = normalizeMultilineSecret(process.env.DATABASE_CA_CERT);
  const explicitSslMode = process.env.DATABASE_SSL_MODE?.trim().toLowerCase();

  if (!ca && !explicitSslMode) {
    return {
      connectionString: normalizedConnectionString,
      max: 1,
      min: 0,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
      statement_timeout: 10_000,
    };
  }

  try {
    const url = new URL(normalizedConnectionString);
    const sslAccept = url.searchParams.get("sslaccept")?.trim().toLowerCase();
    const shouldAcceptInvalidCerts = sslAccept === "accept_invalid_certs";
    const sslSearchParams = ["sslmode", "sslrootcert", "sslcert", "sslkey", "sslaccept"];

    for (const param of sslSearchParams) {
      url.searchParams.delete(param);
    }

    const config: PoolConfig = {
      connectionString: url.toString(),
      max: 1,
      min: 0,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
      statement_timeout: 10_000,
    };

    if (ca) {
      config.ssl = {
        ca,
        rejectUnauthorized: true,
      };
      return config;
    }

    if (shouldAcceptInvalidCerts || explicitSslMode === "require") {
      config.ssl = {
        rejectUnauthorized: false,
      };
      return config;
    }

    if (explicitSslMode) {
      url.searchParams.set("sslmode", explicitSslMode);
      config.connectionString = url.toString();
    }

    return config;
  } catch {
    return {
      connectionString: normalizedConnectionString,
      max: 1,
      min: 0,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    };
  }
}

function isCloudflareWorkersRuntime() {
  if (process.env.CLOUDFLARE_WORKERS === "true") {
    return true;
  }

  if (typeof (globalThis as typeof globalThis & { WebSocketPair?: unknown }).WebSocketPair === "function") {
    return true;
  }

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.includes("Cloudflare-Workers")
  ) {
    return true;
  }

  return false;
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(MISSING_DATABASE_URL_MESSAGE);
  }

  const adapter = new PrismaPg(
    new Pool(buildPoolConfig(process.env.DATABASE_URL))
  );

  if (isCloudflareWorkersRuntime()) {
    return new PrismaClient({ adapter });
  }

  return new PrismaClient({
    adapter,
    log: ["error"],
  });
}

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    return Reflect.get(client, property, receiver);
  },
});

export default prisma;

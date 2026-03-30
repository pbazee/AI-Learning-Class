import { Prisma, PrismaClient } from "@prisma/client";

const TRANSIENT_PRISMA_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const DEFAULT_RETRY_COUNT = Number.parseInt(process.env.PRISMA_RETRY_COUNT ?? "2", 10);
const DEFAULT_RETRY_DELAY_MS = Number.parseInt(process.env.PRISMA_RETRY_DELAY_MS ?? "350", 10);

type PrismaLikeClient = PrismaClient & {
  $extends: PrismaClient["$extends"];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupabaseProjectRef(parsed: URL) {
  const [username, ...rest] = parsed.username.split(".");
  if (username !== "postgres" || rest.length === 0) {
    return undefined;
  }

  return rest.join(".");
}

function normalizePoolerUrl(rawUrl?: string) {
  if (!rawUrl) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    const isSupabaseTransactionPooler =
      parsed.hostname.endsWith("pooler.supabase.com") && parsed.port === "6543";

    if (isSupabaseTransactionPooler) {
      parsed.searchParams.set("pgbouncer", "true");
      parsed.searchParams.set("connection_limit", parsed.searchParams.get("connection_limit") || "5");
      parsed.searchParams.set("pool_timeout", parsed.searchParams.get("pool_timeout") || "30");
      parsed.searchParams.set("connect_timeout", parsed.searchParams.get("connect_timeout") || "15");
      parsed.searchParams.set("sslmode", parsed.searchParams.get("sslmode") || "require");
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function normalizeDirectUrl(rawUrl?: string) {
  if (!rawUrl) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    const isSupabasePoolerHost = parsed.hostname.endsWith("pooler.supabase.com");

    if (isSupabasePoolerHost) {
      if (parsed.port === "6543") {
        parsed.port = "5432";
      }
    }

    parsed.searchParams.delete("pgbouncer");
    parsed.searchParams.delete("connection_limit");
    parsed.searchParams.delete("pool_timeout");
    parsed.searchParams.set("sslmode", parsed.searchParams.get("sslmode") || "require");

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function isRetryablePrismaError(error: unknown) {
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
  ].some((fragment) => message.includes(fragment));
}

export async function withPrismaRetry<T>(operation: () => Promise<T>, label = "Prisma operation") {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= DEFAULT_RETRY_COUNT) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryablePrismaError(error) || attempt === DEFAULT_RETRY_COUNT) {
        throw error;
      }

      const delay = DEFAULT_RETRY_DELAY_MS * (attempt + 1);
      console.warn(`[prisma] ${label} failed on attempt ${attempt + 1}. Retrying in ${delay}ms.`);
      await sleep(delay);
      attempt += 1;
    }
  }

  throw lastError;
}

export function isPrismaConnectionError(error: unknown) {
  return isRetryablePrismaError(error);
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUrl?: string;
  directUrl?: string;
};

const databaseUrl = normalizePoolerUrl(process.env.DATABASE_URL);
const directUrl = normalizeDirectUrl(process.env.DIRECT_URL);

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

if (directUrl) {
  process.env.DIRECT_URL = directUrl;
}

const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
};

if (databaseUrl) {
  prismaOptions.datasources = {
    db: {
      url: databaseUrl,
    },
  };
}

const shouldCreateClient =
  !globalForPrisma.prisma ||
  globalForPrisma.prismaUrl !== databaseUrl ||
  globalForPrisma.directUrl !== directUrl;

if (shouldCreateClient && globalForPrisma.prisma) {
  void globalForPrisma.prisma.$disconnect().catch(() => undefined);
}

function createPrismaClient() {
  const baseClient = new PrismaClient(prismaOptions) as PrismaLikeClient;
  const extendedClient = baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          return withPrismaRetry(
            () => query(args),
            model ? `${model}.${operation}` : operation
          );
        },
      },
    },
  }) as PrismaClient;

  return new Proxy(extendedClient, {
    get(target, prop, receiver) {
      if (prop === "$connect") {
        return () => withPrismaRetry(() => target.$connect(), "$connect");
      }

      if (prop === "$transaction") {
        const transaction = target.$transaction as (...args: any[]) => Promise<any>;
        return (...args: any[]) =>
          withPrismaRetry(() => transaction.apply(target, args), "$transaction");
      }

      return Reflect.get(target, prop, receiver);
    },
  }) as PrismaClient;
}

const prismaClient = shouldCreateClient ? createPrismaClient() : globalForPrisma.prisma!;

export const prisma: PrismaClient = prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
  globalForPrisma.prismaUrl = databaseUrl;
  globalForPrisma.directUrl = directUrl;
}

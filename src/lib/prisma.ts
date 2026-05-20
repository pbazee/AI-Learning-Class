import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function normalizeDatabaseUrl(connectionString?: string) {
  if (!connectionString) {
    return undefined;
  }

  try {
    const url = new URL(connectionString);
    const protocol = url.protocol.toLowerCase();

    if (protocol !== "postgresql:" && protocol !== "postgres:") {
      return connectionString;
    }

    const envSslMode = process.env.DATABASE_SSL_MODE?.trim().toLowerCase();
    const currentSslMode = url.searchParams.get("sslmode")?.trim().toLowerCase();
    const hasLibpqCompat = url.searchParams.get("uselibpqcompat") === "true";
    const isHostedSupabase =
      url.hostname.includes("supabase.com") || url.hostname.includes("pooler.supabase.com");

    if (envSslMode) {
      url.searchParams.set("sslmode", envSslMode);
    }

    // pg-connection-string currently treats sslmode=require more strictly than
    // libpq. For hosted providers like Supabase this can surface as a
    // self-signed chain error during build/runtime on Vercel. Opting into
    // libpq-compatible behavior preserves TLS without enforcing certificate
    // validation semantics that the connection URL did not explicitly ask for.
    if (
      isHostedSupabase &&
      (envSslMode || currentSslMode) === "require" &&
      !hasLibpqCompat
    ) {
      url.searchParams.set("uselibpqcompat", "true");
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    ...(databaseUrl
      ? {
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        }
      : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

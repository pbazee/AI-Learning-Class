import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const MISSING_DATABASE_URL_MESSAGE =
  "No database host or connection string was set. Set DATABASE_URL for this runtime.";

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
  if (isCloudflareWorkersRuntime()) {
    if (!process.env.DATABASE_URL) {
      throw new Error(MISSING_DATABASE_URL_MESSAGE);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
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

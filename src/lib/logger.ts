const SENSITIVE_KEYS = [
  "authorization",
  "authorizationheader",
  "apikey",
  "api_key",
  "api-key",
  "access_token",
  "refresh_token",
  "secret",
  "client_secret",
  "password",
  "token",
];

function sanitize(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.includes(k.toLowerCase())) out[k] = "[REDACTED]";
      else out[k] = sanitize(v);
    }
    return out;
  }
  try {
    return String(value);
  } catch {
    return "[unserializable]";
  }
}

function formatArgs(args: unknown[]) {
  return args
    .map((a) => {
      if (typeof a === "string") return a;
      try {
        return JSON.stringify(sanitize(a));
      } catch {
        return String(a);
      }
    })
    .join(" ");
}

import { env } from "@/lib/config";

export const logger = {
  info: (...args: unknown[]) => {
    console.info(JSON.stringify({ level: "info", ts: new Date().toISOString(), msg: formatArgs(args) }));
  },
  warn: (...args: unknown[]) => {
    console.warn(JSON.stringify({ level: "warn", ts: new Date().toISOString(), msg: formatArgs(args) }));
  },
  error: (...args: unknown[]) => {
    console.error(JSON.stringify({ level: "error", ts: new Date().toISOString(), msg: formatArgs(args) }));
  },
  debug: (...args: unknown[]) => {
    if (env.NODE_ENV !== "production") {
      console.debug(JSON.stringify({ level: "debug", ts: new Date().toISOString(), msg: formatArgs(args) }));
    }
  },
};

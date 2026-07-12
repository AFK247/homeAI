import "server-only";

import pino from "pino";

/*
 * Pino structured logger (§0b). System/error logs only — product analytics go to
 * PostHog + the Postgres `events` table, kept separate from system logging.
 * Server-side only.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
        },
      }
    : {}),
});

import pino from "pino";
import { env } from "../config/env";

// Determine environment
const isDev = process.env.NODE_ENV !== "production";

// Create the logger with optimal configuration
export const logger = pino({
  level: isDev ? "debug" : "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  //   base: {
  //     env: process.env.NODE_ENV || "development",
  //   },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.token",
    ],
    censor: "**REDACTED**",
  },
});

// Create child loggers for different components
export const createLogger = (component: string) => {
  return logger.child({ component });
};

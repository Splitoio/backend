import pinoHttp from "pino-http";
import { logger } from "./logger";
import { IncomingMessage, ServerResponse } from "http";

// Create a simplified HTTP logger with reduced verbosity
export const httpLogger = pinoHttp({
  logger,
  // Skip logging for health checks
  autoLogging: {
    ignore: (req: IncomingMessage): boolean => {
      const url = req.url || "";
      return url.includes("/health") || url.includes("/ping");
    },
  },
  // Use built-in standard serializers to avoid type issues
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  // Simplify messaging
  customSuccessMessage: function (req, res) {
    return `${req.method} ${req.url}`;
  },
  customErrorMessage: function (req, res) {
    return `${req.method} ${req.url} failed with ${res.statusCode}`;
  },
});

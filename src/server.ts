import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { userRouter } from "./routes/user.routes";
import { groupRouter } from "./routes/group.routes";
import { fileRouter } from "./routes/file.routes";
import { multiChainRouter } from "./routes/multichain.routes";
import { currencyRouter } from "./routes/currency.routes";
import { pricingRouter } from "./routes/pricing.routes";
import { expenseRouter } from "./routes/expense.routes";
import { errorHandler } from "./middleware/errorHandler";
import {
  initializeMultiChainSystem,
  initializeChainsAndTokens,
} from "./services/initialize-multichain";
import { initializeFiatCurrencies } from "./services/currency.service";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { FRONTEND_URLS } from "./config/frontend-urls";
import { httpLogger } from "./utils/http-logger";
import { logger } from "./utils/logger";

const app = express();

// Move CORS before all routes
app.use(
  cors({
    origin: FRONTEND_URLS,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.all("/api/auth/*", toNodeHandler(auth));

// Middleware
app.use(express.json());
app.use(helmet());
// Replace morgan with Pino HTTP logger
app.use(httpLogger);
app.use(express.urlencoded({ extended: true }));

app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(session);
});

// Routes
// app.use('/api/auth', authRouter);
app.use("/api/users", userRouter);
app.use("/api/groups", groupRouter);
app.use("/api/files", fileRouter);
app.use("/api/expenses", expenseRouter);
app.use("/api/multichain", multiChainRouter);
app.use("/api/currency", currencyRouter);
app.use("/api/pricing", pricingRouter);

app.use(errorHandler);

const PORT = parseInt(env.PORT);

// Initialize the systems before starting the server
async function initializeApp() {
  try {
    logger.info("Starting application initialization...");

    // Initialize multi-chain system
    logger.info("Initializing multi-chain system...");
    await initializeMultiChainSystem();
    logger.info("Multi-chain system initialized successfully");

    // Initialize chains and tokens in the database
    logger.info("Initializing chains and tokens in database...");
    await initializeChainsAndTokens();
    logger.info("Chains and tokens initialized successfully");

    // Initialize fiat currencies
    logger.info("Initializing fiat currencies...");
    await initializeFiatCurrencies();
    logger.info("Fiat currencies initialized successfully");

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ error }, "Failed to initialize systems");
    process.exit(1);
  }
}

initializeApp();

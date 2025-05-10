import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { userRouter } from "./routes/user.routes";
import { groupRouter } from "./routes/group.routes";
import { fileRouter } from "./routes/file.routes";
// import { authRouter } from './routes/auth.routes';
import { errorHandler } from "./middleware/errorHandler";

import { analyticsRouter } from "./routes/analytics.routes";
import { reminderRouter } from "./routes/reminder.routes";

import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { FRONTEND_URLS } from "./config/frontend-urls";

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

// Using  the analytics route
app.use("/analytics", analyticsRouter);
// Use the reminder route
app.use("/reminders", reminderRouter);

// Middleware
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
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

app.use(errorHandler);

const PORT = parseInt(env.PORT);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

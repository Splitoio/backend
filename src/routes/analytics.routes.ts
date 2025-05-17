import { Router } from "express";
import { getSession } from "../middleware/auth";
import { getAnalyticsController } from "../controllers/analytics.controller";

const router = Router();

// Apply authentication middleware
router.use(getSession);

// Get analytics data
router.get("/", getAnalyticsController);

export const analyticsRouter = router;

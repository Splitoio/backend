import { Router } from "express";
import { getSession } from "../middleware/auth";
import { getAnalytics } from "../controllers/analytics.controller";
const router = Router();

router.use(getSession);

router.get("/", getAnalytics);

export const analyticsRouter = router;

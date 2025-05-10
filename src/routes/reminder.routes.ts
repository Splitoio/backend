import { Router } from "express";
import { getSession } from "../middleware/auth";
import {
  createReminderHandler,
  getRemindersHandler,
} from "../controllers/reminder.controllers";

const router = Router();

router.use(getSession);

router.post("/", createReminderHandler);
router.get("/", getRemindersHandler);

export const reminderRouter = router;

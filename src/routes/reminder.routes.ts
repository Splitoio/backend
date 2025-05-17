import { Router } from "express";
import { getSession } from "../middleware/auth";
import {
  createReminderHandler,
  getRemindersHandler,
  acceptReminderHandler,
  rejectReminderHandler,
} from "../controllers/reminder.controller";

const router = Router();

router.use(getSession);

router.post("/", createReminderHandler);
router.get("/", getRemindersHandler);
router.post("/:reminderId/accept", acceptReminderHandler);
router.post("/:reminderId/reject", rejectReminderHandler);

export const reminderRouter = router;

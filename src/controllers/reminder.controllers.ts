import { Request, Response } from "express";
import {
  createReminder,
  getRemindersForUser,
} from "../services/reminder.service";

export const createReminderHandler = async (req: Request, res: Response) => {
  try {
    const senderId = req.user!.id;
    const reminder = await createReminder(senderId, req.body);
    res.status(201).json(reminder);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getRemindersHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const reminders = await getRemindersForUser(userId);
    res.json(reminders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

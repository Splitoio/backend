import { Request, Response } from "express";
import {
  createReminder,
  getRemindersForUser,
  acceptReminder,
  rejectReminder,
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

export const acceptReminderHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { reminderId } = req.params;
    const reminder = await acceptReminder(reminderId, userId);
    res.json(reminder);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const rejectReminderHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { reminderId } = req.params;
    const reminder = await rejectReminder(reminderId, userId);
    res.json(reminder);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

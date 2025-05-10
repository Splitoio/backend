import { prisma } from "../lib/prisma";
import { ReminderType, ReminderStatus } from "@prisma/client";
import { z } from "zod";

const reminderSchema = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
  reminderType: z.enum([ReminderType.USER, ReminderType.SPLIT]),
  splitId: z.string().optional(),
  content: z.string().optional(), // Corrected to 'content'
});

export const createReminder = async (senderId: string, reminderData: any) => {
  const result = reminderSchema.safeParse(reminderData);
  if (!result.success) {
    throw new Error(`Invalid reminder data: ${result.error.message}`);
  }
  const { receiverId, reminderType, splitId, content } = result.data; // Destructure 'content'

  try {
    const reminder = await prisma.userReminder.create({
      data: {
        senderId,
        receiverId,
        reminderType,
        splitId,
        content,
        status: ReminderStatus.PENDING,
      },
    });
    return reminder;
  } catch (error: any) {
    console.error("Error creating reminder:", error);
    throw new Error("Failed to create reminder: " + error.message);
  }
};

export const getRemindersForUser = async (receiverId: string) => {
  try {
    const reminders = await prisma.userReminder.findMany({
      where: {
        receiverId: receiverId,
        status: ReminderStatus.PENDING,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
        split: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return reminders;
  } catch (error: any) {
    console.error("Error getting reminders for user:", error);
    throw new Error("Failed to get reminders: " + error.message);
  }
};

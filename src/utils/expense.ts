import { prisma } from "../lib/prisma";
import { generateDownloadUrl, fileExists, deleteFile } from "./storage";

/**
 * Get the download URL for an expense's file
 *
 * @param expenseId Expense ID
 * @returns Download URL for the file or null if no file
 */
export const getExpenseFileUrl = async (
  expenseId: string
): Promise<string | null> => {
  try {
    // Get the expense
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { fileKey: true },
    });

    if (!expense || !expense.fileKey) {
      return null;
    }

    // Check if file exists
    const exists = await fileExists(expense.fileKey);
    if (!exists) {
      return null;
    }

    // Generate download URL
    const downloadUrl = await generateDownloadUrl(expense.fileKey);
    return downloadUrl;
  } catch (error) {
    console.error("Error getting expense file URL:", error);
    return null;
  }
};

/**
 * Delete an expense's file from storage
 *
 * @param expenseId Expense ID
 * @returns True if file was deleted, false otherwise
 */
export const deleteExpenseFile = async (
  expenseId: string
): Promise<boolean> => {
  try {
    // Get the expense
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { fileKey: true },
    });

    if (!expense || !expense.fileKey) {
      return false;
    }

    // Check if file exists
    const exists = await fileExists(expense.fileKey);
    if (!exists) {
      return false;
    }

    // Delete the file
    await deleteFile(expense.fileKey);

    // Update the expense to remove the file key
    await prisma.expense.update({
      where: { id: expenseId },
      data: { fileKey: null },
    });

    return true;
  } catch (error) {
    console.error("Error deleting expense file:", error);
    return false;
  }
};

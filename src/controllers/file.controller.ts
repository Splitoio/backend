import { Request, Response } from "express";
import { z } from "zod";
import {
  generateUploadUrl,
  generateDownloadUrl,
  deleteFile,
  fileExists,
} from "../utils/storage";
import { env } from "../config/env";

// Validation schema for upload request
const uploadRequestSchema = z.object({
  fileType: z.string().min(1, "File type is required"),
  fileName: z.string().optional(),
  folder: z.string().optional(),
});

/**
 * Generate a pre-signed URL for file upload
 */
export const getUploadUrl = async (req: Request, res: Response) => {
  try {
    const result = uploadRequestSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const { fileType, fileName, folder = "uploads" } = result.data;

    // Generate a pre-signed URL
    const { uploadUrl, filePath, downloadUrl } = await generateUploadUrl(
      fileType,
      folder,
      fileName
    );

    // Return the URL and file path
    res.status(200).json({
      uploadUrl,
      filePath,
      expiresIn: 15 * 60, // 15 minutes in seconds
      downloadUrl,
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
};

// Validation schema for getFileUrl request
const filePathSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
});

/**
 * Generate a pre-signed URL for file download
 */
export const getFileUrl = async (req: Request, res: Response) => {
  try {
    const result = filePathSchema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const { filePath } = result.data;

    // Check if file exists
    const exists = await fileExists(filePath);
    if (!exists) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Generate download URL
    const downloadUrl = await generateDownloadUrl(filePath);

    res.status(200).json({
      downloadUrl,
      expiresIn: 60 * 60, // 1 hour in seconds
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
};

/**
 * Delete a file from storage
 */
export const deleteFileHandler = async (req: Request, res: Response) => {
  try {
    const result = filePathSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const { filePath } = result.data;

    // Check if file exists
    const exists = await fileExists(filePath);
    if (!exists) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Delete the file
    await deleteFile(filePath);

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};

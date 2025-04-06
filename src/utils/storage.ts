import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { env } from "../config/env";

// Create a storage client
const storage = new Storage({
  projectId: env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: JSON.parse(env.GOOGLE_CLOUD_CREDENTIALS || "{}"),
});

const bucket = storage.bucket(env.GOOGLE_CLOUD_BUCKET_NAME || "");

/**
 * Sets CORS configuration on the bucket to allow cross-origin requests
 */
const configureBucketCors = async () => {
  try {
    await bucket.setCorsConfiguration([
      {
        maxAgeSeconds: 3600,
        method: ["GET", "PUT", "POST", "DELETE", "HEAD"],
        origin: [env.FRONTEND_URL, "http://localhost:3000"],
        responseHeader: [
          "Content-Type",
          "Access-Control-Allow-Origin",
          "Origin",
          "X-Requested-With",
          "Authorization",
        ],
      },
    ]);
    console.log(
      `CORS configuration set for bucket: ${env.GOOGLE_CLOUD_BUCKET_NAME}`
    );
  } catch (error) {
    console.error("Error setting CORS configuration:", error);
  }
};

// Set CORS configuration when this module loads
configureBucketCors().catch((err) => {
  console.error("Failed to set CORS configuration on GCS bucket:", err);
});

/**
 * Generate a signed URL for uploading a file to Google Cloud Storage
 * @param fileType MIME type of the file
 * @param folder Folder to upload the file to
 * @param originalFileName Original file name
 * @returns Object containing the upload URL and file path
 */
export const generateUploadUrl = async (
  fileType: string,
  folder: string = "uploads",
  originalFileName?: string
): Promise<{ uploadUrl: string; filePath: string; downloadUrl: string }> => {
  // Generate a unique filename with uuid
  const extension = originalFileName
    ? path.extname(originalFileName).toLowerCase()
    : getExtensionFromMimeType(fileType);

  const fileName = `${folder}/${uuidv4()}${extension}`;

  // Set options for generating signed URL
  const options = {
    version: "v4" as const,
    action: "write" as const,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: fileType,
  };

  // Generate signed URL for uploading
  const [uploadUrl] = await bucket.file(fileName).getSignedUrl(options);

  return {
    uploadUrl,
    filePath: fileName,
    downloadUrl: `https://storage.googleapis.com/${env.GOOGLE_CLOUD_BUCKET_NAME}/${fileName}`,
  };
};

/**
 * Generate a signed URL for downloading a file from Google Cloud Storage
 * @param filePath Path to the file in the bucket
 * @returns Download URL
 */
export const generateDownloadUrl = async (
  filePath: string
): Promise<string> => {
  if (!filePath) {
    throw new Error("File path is required");
  }

  const options = {
    version: "v4" as const,
    action: "read" as const,
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  };

  const [downloadUrl] = await bucket.file(filePath).getSignedUrl(options);
  return downloadUrl;
};

/**
 * Check if a file exists in the bucket
 * @param filePath Path to the file in the bucket
 * @returns True if the file exists, false otherwise
 */
export const fileExists = async (filePath: string): Promise<boolean> => {
  if (!filePath) return false;

  const [exists] = await bucket.file(filePath).exists();
  return exists;
};

/**
 * Delete a file from the bucket
 * @param filePath Path to the file in the bucket
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  if (!filePath) return;

  await bucket
    .file(filePath)
    .delete()
    .catch((error) => {
      console.error(`Error deleting file ${filePath}:`, error);
    });
};

/**
 * Get file extension from MIME type
 * @param mimeType MIME type of the file
 * @returns File extension with dot
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeTypeToExtension: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
  };

  return mimeTypeToExtension[mimeType] || "";
}

import express from "express";
import {
  getUploadUrl,
  getFileUrl,
  deleteFileHandler,
} from "../controllers/file.controller";
import { getSession } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware
router.use(getSession);

// File upload and download routes
router.post("/upload-url", getUploadUrl);
router.get("/download-url", getFileUrl);
router.delete("/delete", deleteFileHandler);

export const fileRouter = router;

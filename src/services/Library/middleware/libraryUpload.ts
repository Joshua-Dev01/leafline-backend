import { Request, Response, NextFunction } from "express";
import multer from "multer";

// Cloudinary's free plan rejects files over 10MB, so keep the cap there.
// Raise this if the account is on a paid plan.
export const MAX_LIBRARY_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

// Memory storage: the buffer is streamed straight to Cloudinary and (for
// PDFs) parsed for text, so nothing is written to local disk.
const libraryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LIBRARY_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new Error(
          "Unsupported file type. Upload a PDF, Word, PowerPoint, Excel, text or image file."
        )
      );
    }
    cb(null, true);
  },
});

/**
 * `upload.single("file")` wrapped so multer errors (file too large, wrong
 * type) come back as a 400 JSON message instead of Express's default HTML 500.
 */
export const uploadLibraryFileField = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  libraryUpload.single("file")(req, res, (err: any) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: `File is too large. Maximum size is ${
          MAX_LIBRARY_FILE_SIZE / (1024 * 1024)
        }MB.`,
      });
    }
    return res.status(400).json({ message: err.message || "Upload failed" });
  });
};
import { ErrorRequestHandler } from "express";
import multer from "multer";
import { AppError } from "../utils/AppError";

/**
 * Global error handler. Mount it LAST in app.ts.
 * Turns the usual suspects (bad ids, validation, uploads, duplicates)
 * into clean JSON instead of an HTML 500 page.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  let status = 500;
  let message = "Something went wrong";
  let code: string | undefined;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (err instanceof multer.MulterError) {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image is too large (max 5 MB)"
        : err.message;
  } else if (err?.name === "CastError") {
    status = 400;
    message = "Invalid id";
  } else if (err?.name === "ValidationError" && err.errors) {
    status = 400;
    message = (Object.values(err.errors)[0] as any)?.message ?? "Invalid data";
  } else if (err?.code === 11000) {
    status = 409;
    message = "That already exists";
  } else if (err?.message === "Not allowed by CORS") {
    status = 403;
    message = "Not allowed by CORS";
  } else if (
    typeof err?.status === "number" &&
    err.status >= 400 &&
    err.status < 500
  ) {
    // body-parser errors (bad JSON, payload too large, ...)
    status = err.status;
    message = err.expose ? err.message : "Bad request";
  }

  if (status >= 500) console.error("❌ Unhandled error:", err);

  res.status(status).json({
    message:
      status >= 500 && process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : message,
    ...(code ? { code } : {}),
  });
};

import streamifier from "streamifier";
import cloudinary from "../../../config/cloudinary";

/** Friendly file bucket derived from the mime type. */
export const deriveFileType = (mime: string): string => {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("text/")) return "text";
  if (mime.includes("presentation") || mime.includes("powerpoint"))
    return "presentation";
  if (mime.includes("spreadsheet") || mime.includes("excel"))
    return "spreadsheet";
  if (mime.includes("word")) return "document";
  return "file";
};

/**
 * FormData can't carry real arrays — tags arrive as a JSON-stringified array
 * or a plain comma-separated string.
 */
export const parseTags = (raw: unknown): string[] => {
  const clean = (arr: unknown[]) =>
    Array.from(
      new Set(
        arr
          .map((t) => String(t).trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10)
      )
    );

  if (Array.isArray(raw)) return clean(raw);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return clean(parsed);
  } catch {
    // not JSON — fall back to comma-separated
  }
  return clean(raw.split(","));
};

/** Escape user input before using it inside a RegExp. */
export const escapeRegex = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface CloudUpload {
  url: string;
  publicId: string;
  bytes: number;
  resourceType: "image" | "raw" | "video";
  pages?: number;
}

/**
 * Stream a buffer to Cloudinary. PDFs and images go up as "image" so
 * Cloudinary can serve them inline (and render PDF pages); everything else
 * is stored as "raw".
 */
export const uploadLibraryFile = (
  buffer: Buffer,
  mimeType: string
): Promise<CloudUpload> => {
  const asImage = mimeType === "application/pdf" || mimeType.startsWith("image/");
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "leafline/library",
        resource_type: asImage ? "image" : "raw",
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          resourceType: result.resource_type as CloudUpload["resourceType"],
          pages: (result as any).pages,
        });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const deleteLibraryFile = async (
  publicId: string,
  resourceType: "image" | "raw" | "video"
): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (e) {
    console.warn(`[Library] Failed to delete Cloudinary file ${publicId}:`, e);
  }
};

/**
 * Cloudinary serves a file as a download when the delivery URL contains the
 * `fl_attachment` flag right after `/upload/`.
 */
export const toDownloadUrl = (url: string, fileName?: string): string => {
  const flag = fileName
    ? `fl_attachment:${encodeURIComponent(
        fileName.replace(/\.[^.]+$/, "").replace(/[^\w\-]+/g, "_")
      )}`
    : "fl_attachment";
  return url.replace("/upload/", `/upload/${flag}/`);
};

// Cap what we keep for AI so one huge PDF can't bloat the document.
export const MAX_EXTRACTED_CHARS = 60_000;

/** Best-effort PDF text extraction. Never throws. */
export const extractPdfText = async (
  buffer: Buffer
): Promise<{ text: string; pages?: number }> => {
  try {
    // Import the lib file directly: the package's index runs debug code on
    // import when it isn't loaded as a module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse(buffer);
    const text = String(data.text || "")
      .replace(/\s+\n/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
      .slice(0, MAX_EXTRACTED_CHARS);
    return { text, pages: data.numpages };
  } catch (e) {
    console.warn("[Library] PDF text extraction failed:", e);
    return { text: "" };
  }
};
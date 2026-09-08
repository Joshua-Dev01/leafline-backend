import streamifier from "streamifier";
import cloudinary from "../../../config/cloudinary";

interface UploadResult {
  url:      string;
  publicId: string;
}

/**
 * Upload a buffer to Cloudinary and return url + publicId.
 */
export const uploadImage = (
  buffer: Buffer,
  folder = "leafline/events"
): Promise<UploadResult> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

/**
 * Delete an image from Cloudinary by its public_id.
 * Fails silently — don't block main operation if this errors.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    console.warn(`[Cloudinary] Failed to delete image: ${publicId}`);
  }
};
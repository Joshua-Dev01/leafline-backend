import { Request, Response } from "express";
import multer from "multer";
// @ts-ignore
import streamifier from "streamifier";
import cloudinary from "../../config/cloudinary";
import { Picture } from "./model/profilePicture.model";
import { LeafLineUser } from "../signup/model/user.model";

// Multer in-memory setup
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// ─── Upload or Update Picture ────────────────────────────
export const uploadPicture = async (req: any, res: Response) => {
  try {
    const user = await LeafLineUser.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!req.file)
      return res.status(400).json({ message: "No image file provided" });

    // 🧩 Find existing picture document
    const existingPic = await Picture.findOne({ userId: user._id });

    // 🧹 Delete previous picture from Cloudinary if it exists
    if (existingPic) {
      await cloudinary.uploader.destroy(existingPic.publicId);
    }

    // 🖼 Upload new picture to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "leafline/users",
        resource_type: "image",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
        ],
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary error:", error);
          return res
            .status(500)
            .json({ message: "Image upload failed", error });
        }

        if (!result?.secure_url || !result?.public_id) {
          return res.status(500).json({ message: "No image URL returned" });
        }

        // 🧱 Save or update picture record
        let picture;
        if (existingPic) {
          existingPic.url = result.secure_url;
          existingPic.publicId = result.public_id;
          picture = await existingPic.save();
        } else {
          picture = await Picture.create({
            userId: user._id,
            url: result.secure_url,
            publicId: result.public_id,
          });
        }

        // 🧩 Link picture to user
        user.picture = picture._id != null ? String(picture._id) : undefined;
        await user.save();

        res.status(200).json({
          message: "Profile picture uploaded successfully",
          picture,
        });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Image upload failed", error });
  }
};

// ─── Get Picture ────────────────────────────
export const getUserPicture = async (req: any, res: Response) => {
  try {
    const picture = await Picture.findOne({ userId: req.user._id });
    if (!picture)
      return res.status(404).json({ message: "No profile picture found" });

    res.status(200).json({ picture });
  } catch (error) {
    res.status(500).json({ message: "Failed to get profile picture", error });
  }
};

// ─── Delete Picture ─────────────────────────
export const deleteUserPicture = async (req: any, res: Response) => {
  try {
    const picture = await Picture.findOne({ userId: req.user._id });
    if (!picture)
      return res.status(400).json({ message: "No profile picture to delete" });

    await cloudinary.uploader.destroy(picture.publicId);
    await Picture.deleteOne({ _id: picture._id });

    await LeafLineUser.findByIdAndUpdate(req.user._id, { $unset: { picture: "" } });

    res.status(200).json({
      message: "Profile picture deleted successfully",
      picture: null,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete profile picture", error });
  }
};

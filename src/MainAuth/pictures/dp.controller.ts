import { Request, Response } from "express";
import multer from "multer";
import streamifier from "streamifier";
import cloudinary from "../../config/cloudinary";
import { LeafLineUser } from "../signup/model/user.model";
import { ProfilePicture } from "./model/profilePicture.model";

// ✅ Multer memory storage for rapid upload
const storage = multer.memoryStorage();
export const upload = multer({ storage }).single("image");

// ✅ Upload / Update Profile Picture
export const uploadProfilePicture = async (req: any, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file uploaded" });
        }

        const userId = req.user.id;
        const user = await LeafLineUser.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const existingPic = await ProfilePicture.findOne({ userId });

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "leafline/users",
                transformation: [
                    { width: 400, height: 400, crop: "fill", gravity: "face" },
                ],
            },
            async (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return res.status(500).json({ message: "Image upload failed", error });
                }

                if (!result?.secure_url || !result?.public_id) {
                    return res.status(500).json({ message: "Invalid Cloudinary Response" });
                }

                let savedPicture;

                if (existingPic) {
                    // ✅ Delete old Cloudinary image first
                    await cloudinary.uploader.destroy(existingPic.publicId);

                    existingPic.url = result.secure_url;
                    existingPic.publicId = result.public_id;
                    savedPicture = await existingPic.save();
                } else {
                    savedPicture = await ProfilePicture.create({
                        userId,
                        url: result.secure_url,
                        publicId: result.public_id,
                    });
                }

                // ✅ Update user object reference
                user.picture = savedPicture.id.toString();
                await user.save();

                return res.status(200).json({
                    message: "Profile picture uploaded successfully",
                    picture: savedPicture,
                });
            }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({
            message: "Unable to upload profile picture",
            error: error.message,
        });
    }
};

// ✅ Get Logged-In User Profile Picture
export const getProfilePicture = async (req: any, res: Response) => {
    try {
        const picture = await ProfilePicture.findOne({ userId: req.user.id });

        if (!picture) {
            return res.status(200).json({
                message: "No profile picture yet",
                picture: null,
            });
        }

        return res.status(200).json({
            message: "Profile picture fetched",
            picture,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error retrieving picture",
            error,
        });
    }
};

// ✅ Delete Logged-In User Profile Picture
export const deleteProfilePicture = async (req: any, res: Response) => {
    try {
        const picture = await ProfilePicture.findOne({ userId: req.user.id });

        if (!picture) {
            return res.status(404).json({ message: "No picture to delete" });
        }

        await cloudinary.uploader.destroy(picture.publicId);
        await ProfilePicture.deleteOne({ _id: picture._id });

        await LeafLineUser.findByIdAndUpdate(req.user.id, {
            $unset: { picture: "" },
        });

        res.status(200).json({ message: "Profile picture deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting picture", error });
    }
};

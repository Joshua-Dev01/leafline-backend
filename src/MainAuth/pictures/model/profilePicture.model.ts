import mongoose, { Document, Schema } from "mongoose";

export interface IProfilePicture extends Document {
  userId: mongoose.Types.ObjectId;
  url: string;
  publicId: string;
  createdAt?: Date;
}

const profilePictureSchema = new Schema<IProfilePicture>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeafLineUser",
      required: true,
      unique: true,
    },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { timestamps: true }
);

export const ProfilePicture = mongoose.model<IProfilePicture>(
  "ProfilePicture",
  profilePictureSchema
);

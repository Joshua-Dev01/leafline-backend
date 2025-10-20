import mongoose from "mongoose";

export interface IPicture extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  url: string;
  publicId: string;
  createdAt?: Date;
}

const pictureSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { timestamps: true }
);

export const Picture = mongoose.model<IPicture>("Picture", pictureSchema);

// models/note.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  title: string;
  icon: string;
  description?: string;
  fileUrl?: string; // PDF or image
  filePublicId?: string;
  fileSize?: number; // bytes
  fileType?: string; // "image", "raw", "video", "pdf", "unknown"
  fileMimeType?: string; // actual mime type like application/pdf, image/png
  createdAt?: Date;
  updatedAt?: Date;
}

const noteSchema = new Schema<INote>(
  {
        userId: { type: Schema.Types.ObjectId, ref: "LeafLineUser", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    title: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    fileUrl: { type: String },
    filePublicId: { type: String },
     fileSize: { type: Number }, // bytes
    fileType: { type: String }, // cloudinary resource_type or derived type
    fileMimeType: { type: String },
  },
  { timestamps: true }
);

export const Note = mongoose.model<INote>("Note", noteSchema);

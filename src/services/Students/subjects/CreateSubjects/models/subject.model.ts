import { Schema, model, Document } from "mongoose";

export interface ISubject extends Document {
  userId: string;
  name: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

export const Subject = model<ISubject>("Subject", subjectSchema);

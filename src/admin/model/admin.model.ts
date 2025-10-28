import mongoose, { Document, Schema } from "mongoose";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  role: "superadmin" | "admin" | "user";
  createdAt: Date;
}

const adminSchema = new Schema<IAdmin>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["superadmin", "admin", "user"],
    default: "user",
  },
  createdAt: { type: Date, default: Date.now },
});

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);

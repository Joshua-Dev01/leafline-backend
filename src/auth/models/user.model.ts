import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);

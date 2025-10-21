import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "user" | "admin";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  picture?: string;
  googleId?: string;
  isGoogleAccount?: boolean;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: function () { return !this.isGoogleAccount; } },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    phone: { type: String, default: null },
    picture: { type: mongoose.Schema.Types.ObjectId, ref: "Picture" },
    googleId: { type: String, default: "" },
    isGoogleAccount: { type: Boolean, default: false },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);

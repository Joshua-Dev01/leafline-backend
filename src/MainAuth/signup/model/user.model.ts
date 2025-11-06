import mongoose, { Schema, Document } from "mongoose";

export type AccountType = "Education" | "Business" | "Personal";
export type UserRole = "user" | "admin" | "superadmin";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId; // explicit _id
  name: string;
  email: string;
  password: string;
  accountType: AccountType;
  isVerified: boolean;
  verificationCode?: string | null;
  verificationExpires?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  picture?: string;
  role: UserRole;
  bio: string;
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bio: { type: String},
    accountType: {
      type: String,
      enum: ["Education", "Business", "Personal"],
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    verificationExpires: { type: Date, default: null },
    picture: { type: String },
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        // ret is the plain object that will be returned to the client
        ret.id = ret._id?.toString(); // add id string
        delete ret._id;
        delete ret.__v;
        delete ret.password; // never expose password
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

export const LeafLineUser = mongoose.model<IUser>("LeafLineUser", userSchema);

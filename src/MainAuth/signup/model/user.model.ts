import mongoose, { Schema, Document } from "mongoose";

export type AccountType = "Education" | "Business" | "Personal";
export type UserRole = "user" | "admin" | "superadmin";

export interface ISubscription {
  plan: mongoose.Types.ObjectId; // references Plan model
  startDate: Date;
  expiryDate: Date;
  active: boolean;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  accountType: AccountType;
  role: UserRole;
  isVerified: boolean;
  verificationCode?: string | null;
  verificationExpires?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  picture?: string;
  bio: string;
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  subscription?: ISubscription; // <-- subscription info
}

const subscriptionSchema = new Schema<ISubscription>({
  plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  active: { type: Boolean, default: false },
});

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bio: { type: String },
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
    subscription: { type: subscriptionSchema, default: null }, // added subscription
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id?.toString();
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

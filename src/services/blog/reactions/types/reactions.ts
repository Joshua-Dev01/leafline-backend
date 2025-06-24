import { Request } from "express";
import mongoose from "mongoose";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string; // ✅ Add id explicitly
    _id: mongoose.Types.ObjectId | string;
    name?: string;
    email?: string;
    role?: "user" | "admin";
  };
}

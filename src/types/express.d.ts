import mongoose from "mongoose";

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      _id: mongoose.Types.ObjectId;
      name: string;
      email: string;
      accountType: "Education" | "Business" | "Personal"; // ✅ replaces role
      phone?: string;
      picture?: string;
      role: "user" | "admin" | "superadmin";
      bio?: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { LeafLineUser } from "../signup/model/user.model";

export type UserRole = "user" | "admin" | "superadmin";
export type AccountType = "Education" | "Business" | "Personal";

// ✅ Extend Express Request type globally
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        accountType: AccountType;
        isVerified: boolean;
        picture: string;
        role: UserRole;
      };
    }
  }
}

interface CustomJwtPayload extends JwtPayload {
  id: string;
}

// ✅ Auth middleware
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Not authorized — no token provided" });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      console.error("❌ Missing JWT_SECRET in .env");
      return res.status(500).json({ message: "Server configuration error" });
    }

    // ✅ Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as CustomJwtPayload;

    // ✅ Find user in DB
    const user = await LeafLineUser.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Optionally block unverified users
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before continuing" });
    }

    // ✅ Attach user to request object
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      accountType: user.accountType,
      picture: user.picture || "",
      role: user.role,
    };

    next();
  } catch (error: any) {
    console.error("❌ Auth Error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

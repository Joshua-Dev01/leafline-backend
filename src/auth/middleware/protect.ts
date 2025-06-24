import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { AuthenticatedRequest } from "../../services/blog/reactions/types/reactions";

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];

    try {
      if (!token || !process.env.JWT_SECRET) {
        return res
          .status(401)
          .json({ message: "Not authorized, token or secret missing" });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as unknown as {
        id: string;
      };

      const user = await User.findById(decoded.id).select("name email role");

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = {
        id: user._id.toString(), // ✅ required for compatibility
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      return next();
    } catch (err) {
      return res.status(401).json({ message: "Token invalid or expired" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token" });
};

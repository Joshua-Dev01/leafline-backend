// src/middleware/checkRole.ts
import { Request, Response, NextFunction } from "express";

// roleArray = ["superadmin"], ["admin"], ["superadmin", "admin"], etc.
export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // req.user.accountType? or req.user.role if you add role to user model
    // We'll assume you added req.user.role: "user" | "admin" | "superadmin"
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }

    next();
  };
};

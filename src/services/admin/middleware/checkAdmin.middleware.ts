import { Request, Response, NextFunction } from "express";

interface UserWithRole {
  id: string;
  role: string;
}

export const checkAdmin = (req: Request & { user?: UserWithRole }, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

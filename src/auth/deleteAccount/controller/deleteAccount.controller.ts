// src/auth/deleteAccount/controller/deleteAccount.controller.ts
import { Request, Response } from "express";
import { User } from "../../models/user.model";

export const deleteAccount = async (req: Request, res: Response) => {
  const userId = req.user?.id; // comes from JWT middleware

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  await User.findByIdAndDelete(userId);

  res.status(200).json({ message: "Account deleted successfully" });
};

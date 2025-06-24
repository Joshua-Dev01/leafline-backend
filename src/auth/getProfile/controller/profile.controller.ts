import { Request, Response } from "express";

export const getProfile = async (req: any, res: Response) => {
  if (!req.user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
};

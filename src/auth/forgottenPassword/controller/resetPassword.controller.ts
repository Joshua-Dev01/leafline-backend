import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../../models/user.model";

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired token" });

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({ message: "Password reset successful" });
};

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { LeafLineUser } from "../signup/model/user.model";

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, code, and new password are required" });
    }

    const user = await LeafLineUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if code matches and not expired
    if (
      user.resetPasswordCode !== code ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    // Hash and update new password
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "✅ Password reset successful." });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    res
      .status(500)
      .json({ message: "Password reset failed", error: error.message });
  }
};

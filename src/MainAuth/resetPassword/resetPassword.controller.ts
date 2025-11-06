import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { LeafLineUser } from "../signup/model/user.model";

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Invalid or missing token" });
    }

    // Find user by reset token
    const user = await LeafLineUser.findOne({
      resetPasswordCode: token,
      resetPasswordExpires: { $gt: new Date() }, // token not expired
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    // Hash and update new password
    const hashed = await bcrypt.hash(password, 10);
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

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { LeafLineUser } from "../signup/model/user.model";

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // assuming protect middleware adds this
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both old and new passwords are required" });
    }

    const user = await LeafLineUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "✅ Password changed successfully." });
  } catch (error: any) {
    console.error("Change Password Error:", error);
    res
      .status(500)
      .json({ message: "Password change failed", error: error.message });
  }
};

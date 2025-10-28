import { Request, Response } from "express";
import { LeafLineUser } from "../signup/model/user.model";

export const updateProfile = async (req: Request, res: Response) => {
  try {
    // ✅ Ensure req.user exists (TypeScript-safe)
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized — user not found in request" });
    }

    const { name, accountType } = req.body;

    const user = await LeafLineUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (accountType) user.accountType = accountType;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

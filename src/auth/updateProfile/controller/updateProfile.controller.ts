import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../../models/user.model";

// Ensure you have a `protect` middleware that attaches `req.user`
export const updateProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No user in request" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, email, password, phone, picture } = req.body;

    // Prevent email duplication
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email;
    }

    // Update fields if provided
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (picture) user.picture = picture;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        picture: updatedUser.picture,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return res.status(500).json({
      message: "Update failed",
      error: error.message || error,
    });
  }
};

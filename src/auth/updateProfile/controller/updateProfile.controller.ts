import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../../models/user.model";

export const updateProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, password } = req.body;

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    const updated = await user.save();

    res.status(200).json({
      user: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err });
  }
};

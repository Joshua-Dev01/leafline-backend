import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../../models/user.model";
import { generateToken } from "../../utils/generateToken";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = generateToken(user._id.toString(), user.role);
    res
      .status(201)
      .json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err });
  }
};

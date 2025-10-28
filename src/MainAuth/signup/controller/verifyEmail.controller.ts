import { Request, Response } from "express";
import { LeafLineUser } from "../model/user.model";
import { generateToken } from "../../../utils/generateToken";

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    // Find user by email
    const user = await LeafLineUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user already verified
    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Validate code and expiration
    if (
      user.verificationCode !== code ||
      !user.verificationExpires ||
      user.verificationExpires < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    await user.save();

    const token = generateToken(user._id.toString(), user.email, "user", user.accountType);


    res.status(200).json({
      message: "✅ Email verified successfully!",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    console.error("❌ Email Verification Error:", err);
    res.status(500).json({
      message: "Email verification failed",
      error: err.message,
    });
  }
};

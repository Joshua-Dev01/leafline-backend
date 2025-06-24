import { Request, Response } from "express";
import crypto from "crypto";
import { User } from "../../models/user.model";
import { sendEmail } from "../../utils/sendEmail";
import { generateResetToken } from "../../utils/generateToken";

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  console.log("📨 Forgot Password request for:", email);

  const user = await User.findOne({ email });
  if (!user) {
    console.log("❌ User not found");
    return res.status(404).json({ message: "User not found" });
  }

  const { resetToken, hashedToken } = generateResetToken();
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  await user.save();

  const resetURL = `http://localhost:3000/reset-password?token=${resetToken}`;
  const message = `
    <h1>Password Reset</h1>
    <p>Click the link below to reset your password. This link will expire in 15 minutes.</p>
    <a href="${resetURL}">${resetURL}</a>
  `;

  console.log("🔗 Sending email with reset URL:", resetURL);

  await sendEmail(user.email, "LeafLine Password Reset", message);

  res.status(200).json({ message: "Password reset email sent" });
};

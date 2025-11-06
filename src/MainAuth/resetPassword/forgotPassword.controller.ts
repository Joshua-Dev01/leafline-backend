import { Request, Response } from "express";
import crypto from "crypto";
import { LeafLineUser } from "../signup/model/user.model";
import { sendVerificationEmail } from "../../utils/sendVerificationEmail";

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await LeafLineUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Generate secure token stored in DB
    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordCode = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await user.save();

    // ✅ FRONTEND URL — change if deployed
    const resetLink = `http://localhost:3000/auth/reset-password?token=${resetToken}`;

    // ✅ Email Template with clickable link
    const html = `
<div style="text-align: center; font-family: Arial, sans-serif; background-color:#f9f9f9; padding: 20px; border-radius: 12px;">
  <img
    src="https://lh3.googleusercontent.com/gg/AIJ2gl8VT8-2pYmCwH6d_8Jh81o9es9KUy6ZctMj3vIzVVOqfFTmkVYD_XqL9TDciSQMtuPyk2KPPCzBEJt6kEJ-U2DHqB5KI0t-fYAPWSSzEPH_4hQ9qs0qShZc2KVwfIaqbPKgWWPwuEzd31bqftps9AM3vWPdG-_CEIBe_V67vuSM9Qzr5eABt7HzT1aKuKwK_6aFRcd9PUS_QY9TmWoXqavIcVPprXfbhURrTLaE5eTlTv-gBSGVzD_0P2uKkKBfWuxsWNTUsGqz7-FD7OlTB32g9j8GFuAcCYPxCNJu_XdMHs4ve88bBIRZFLAQzEQnno_u1hzJMxVBZLyJT89tgxtv=s1024-rj"
    width="100"
    style="margin-bottom: 10px;"
  />
  
  <h2 style="color:#0A1A44; font-size:24px; margin:16px 0;">
    Reset Your Password
  </h2>

  <p style="font-size:15px; color:#555; max-width:320px; margin:0 auto 18px;">
    Forgot your password? Don’t worry — just click the button below to create a new one.
  </p>

  <a
    href="${resetLink}"
    style="
      display:inline-block;
      background-color:#001F3F;
      padding:14px 30px;
      color:#ffffff;
      font-weight:bold;
      text-decoration:none;
      margin-top:10px;
      border-radius:8px;
      font-size:15px;
    "
  >
    Reset Password
  </a>

  <p style="margin-top:16px; font-size:13px; color:#777;">
    This link will expire in 10 minutes for security reasons.
  </p>

  <p style="font-size:12px; color:#A0A0A0; margin-top:20px;">
    If you didn’t request this, please ignore this email.
  </p>
</div>
`;

    await sendVerificationEmail(user.email, "LeafLine Password Reset", html);

    return res.status(200).json({
      message: "Reset password link sent to your email.",
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({
      message: "Failed to send reset email",
      error: error.message,
    });
  }
};

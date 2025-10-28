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

    // Generate reset code and expiry (10 mins)
    const resetCode = crypto.randomInt(100000, 999999).toString();
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Email template
    const html = `
      <div style="text-align: center; font-family: Arial, sans-serif;">
        <img src="https://lh3.googleusercontent.com/gg/AIJ2gl8VT8-2pYmCwH6d_8Jh81o9es9KUy6ZctMj3vIzVVOqfFTmkVYD_XqL9TDciSQMtuPyk2KPPCzBEJt6kEJ-U2DHqB5KI0t-fYAPWSSzEPH_4hQ9qs0qShZc2KVwfIaqbPKgWWPwuEzd31bqftps9AM3vWPdG-_CEIBe_V67vuSM9Qzr5eABt7HzT1aKuKwK_6aFRcd9PUS_QY9TmWoXqavIcVPprXfbhURrTLaE5eTlTv-gBSGVzD_0P2uKkKBfWuxsWNTUsGqz7-FD7OlTB32g9j8GFuAcCYPxCNJu_XdMHs4ve88bBIRZFLAQzEQnno_u1hzJMxVBZLyJT89tgxtv=s1024-rj" width="100" style="margin-bottom: 15px;" />
        <h2 style="color:#4CAF50;">Reset Your Password</h2>
        <p>Please use the following code to reset your password:</p>
        <h1 style="font-size: 28px; color: #fff;  border: 2px dotted #04033fff; display: inline-block; padding: 10px 20px; border-radius: 8px;">${resetCode}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    `;

    await sendVerificationEmail(user.email, "LeafLine Password Reset", html);

    res.status(200).json({
      message: "Password reset code sent to your email.",
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    res
      .status(500)
      .json({ message: "Failed to send reset email", error: error.message });
  }
};

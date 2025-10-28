import { Request, Response } from "express";
import crypto from "crypto";
import { LeafLineUser } from "../model/user.model";
import { sendVerificationEmail } from "../../../utils/sendVerificationEmail";

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await LeafLineUser.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified)
      return res.status(400).json({ message: "Email already verified" });

    // Generate new code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    user.verificationCode = verificationCode;
    user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const html = `
     <div style="
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #0c0c0cff;
  color: #eaeaea;
  padding: 40px 25px;
  border-radius: 12px;
  max-width: 600px;
  margin: 0 auto;
">
 <div style="
  text-align: center;
  margin-bottom: 35px;
  background-color: #0d0d0d;
  padding: 25px 0;
  border-radius: 14px;
">
  <img
    src="https://res.cloudinary.com/df4uernet/image/upload/v1761617795/logo_ez2xes.png"
    alt="LeafLine Logo"
    style="
      width: 150px;
      height: 150px;
      border-radius: 10px;
      object-fit: cover;
      box-shadow: 0 4px 10px rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.05);
      background-color: #111;
      display: inline-block;
    "
  />
</div>


  <h1 style="
    color: #dbdbdbff;
    font-size: 23px;
    margin-bottom: 20px;
    letter-spacing: 1px;
  ">
    Email Verification Resend
  </h1>

  <p style="color: #c9c9c9; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
    Hi there 👋,<br/><br/>
    Thank you for creating a <strong>LeafLine</strong> account!
    To complete your signup, please verify your email using the code below.
  </p>

  <div style="
    text-align: center;
    margin-bottom: 30px;
  ">
    <div style="
      display: inline-block;
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      background-color: #111111;
      border: 1.7px dashed #4a4a4a;
      border-radius: 10px;
      padding: 30px 85px;
      letter-spacing: 10px;
    ">
      ${verificationCode}
    </div>
  </div>

  <p style="color: #a0a0a0; font-size: 15px; line-height: 1.6;">
    This code will expire in <strong>10 minutes</strong> for security purposes.
    <br/><br/>
    If you did not create a LeafLine account, please ignore this message.
  </p>

  <hr style="border: none; border-top: 1px solid #222; margin: 40px 0;" />

  <footer style="color: #6b6b6b; font-size: 13px; text-align: center;">
    © ${new Date().getFullYear()} LeafLine. All rights reserved.  
    <br/>Learn, Grow, and Connect on the LeafLine Hub.
  </footer>
</div>
    `;

    await sendVerificationEmail(
      user.email,
      "Resend LeafLine Verification Code",
      html
    );

    res.status(200).json({
      message: "Verification code resent successfully",
    });
  } catch (error: any) {
    console.error("Resend Email Error:", error);
    res
      .status(500)
      .json({
        message: "Failed to resend verification email",
        error: error.message,
      });
  }
};

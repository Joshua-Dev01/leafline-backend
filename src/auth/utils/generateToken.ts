import jwt from "jsonwebtoken";
import crypto from "crypto";

 
export const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
};

export const generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  return { resetToken, hashedToken };
};

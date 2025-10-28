import jwt from "jsonwebtoken";
import { AccountType, UserRole } from "../MainAuth/signup/model/user.model";

export const generateToken = (
  id: string,
  email: string,
  role: UserRole,
  accountType?: AccountType
): string => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set in .env");

  return jwt.sign(
    {
      id,
      email,
      role,
      accountType: accountType ?? "Education", // fallback
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

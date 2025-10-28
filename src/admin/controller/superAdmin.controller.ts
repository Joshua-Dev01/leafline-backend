// src/admin/superadmin.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { LeafLineUser } from "../../MainAuth/signup/model/user.model";
import { generateToken } from "../../utils/generateToken";

export const superAdminSignup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // ✅ Check if super admin exists
    const existing = await LeafLineUser.findOne({ role: "superadmin" });
    if (existing)
      return res.status(403).json({ message: "Super admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const superAdmin = await LeafLineUser.create({
      name,
      email,
      password: hashedPassword,
      accountType: "Business",
      isVerified: true,
      role: "superadmin",
    });

    const token = generateToken(superAdmin._id.toString(), superAdmin.email, "superadmin", "Business");


    res.status(201).json({
      message: "Super admin created successfully",
      token,
      superAdmin: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
      },
    });
  } catch (err: any) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Super admin creation failed", error: err.message });
  }
};

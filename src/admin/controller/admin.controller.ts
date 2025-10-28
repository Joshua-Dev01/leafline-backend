// src/admin/admin.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { LeafLineUser } from "../../MainAuth/signup/model/user.model";
import { generateToken } from "../../utils/generateToken";

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // ✅ Only super admin can create admins
    if (!req.user || req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const existing = await LeafLineUser.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await LeafLineUser.create({
      name,
      email,
      password: hashedPassword,
      accountType: "Business",
      isVerified: true,
      role: "admin",
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err: any) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Admin creation failed", error: err.message });
  }
};

// ADMIN LOGIN
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await LeafLineUser.findOne({ email });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user._id.toString(), user.email, "admin", user.accountType);


    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// REMOVE ADMIN
export const removeAdmin = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { adminId } = req.params;
    const admin = await LeafLineUser.findById(adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ message: "Admin not found" });
    }

    await admin.deleteOne();
    res.status(200).json({ message: "Admin removed successfully" });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Failed to remove admin", error: err.message });
  }
};

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const admins = await LeafLineUser.find({ role: "admin" }).select(
      "-password"
    );
    res.status(200).json({ admins });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Failed to fetch admins", error: err.message });
  }
};

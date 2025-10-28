import { Request, Response } from "express";
import { LeafLineUser } from "../signup/model/user.model";

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    // ✅ Safely check if req.user exists
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized — user not found in request" });
    }

    const user = await LeafLineUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();

    return res.status(200).json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete Account Error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

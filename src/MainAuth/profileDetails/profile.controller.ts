import { Request, Response } from "express";
import { LeafLineUser } from "../signup/model/user.model";

export const getProfile = async (req: Request, res: Response) => {
    try {
        // ✅ Type-safe check before accessing `req.user`
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized — user not found in request" });
        }

        const user = await LeafLineUser.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Profile fetched successfully",
            user,
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        return res.status(500).json({ message: "Server error", error });
    }
};

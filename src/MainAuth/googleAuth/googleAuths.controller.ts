import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { LeafLineUser } from "../signup/model/user.model";
import { generateToken } from "../../utils/generateToken";


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Google token is required" });
        }

        // ✅ Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return res.status(400).json({ message: "Invalid Google token" });
        }

        const { email, name, picture } = payload;

        // ✅ Check if user exists
        let user = await LeafLineUser.findOne({ email });

        // ✅ Create new user if not exists
        if (!user) {
            user = await LeafLineUser.create({
                name: name || "Google User",
                email,
                picture,
                isVerified: true, // Google users are auto-verified
                accountType: "Personal", // default account type (you can change)
            });
        }

        // ✅ Generate JWT token
        const jwtToken = generateToken(user._id.toString(), user.email, "user", user.accountType);

        res.status(200).json({
            message: user ? "Login successful" : "Signup successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture,
                accountType: user.accountType,
            },
            token: jwtToken,
        });
    } catch (error: any) {
        console.error("Google Auth Error:", error);
        res.status(500).json({ message: "Google authentication failed", error: error.message });
    }
};

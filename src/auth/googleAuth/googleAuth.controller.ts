import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model";
import { createNotification } from "../../services/Notifications/services/notification.service";
import { generateToken } from "../utils/generateToken";

// Initialize Google client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Google token missing" });
        }

        // 🔍 Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(400).json({ message: "Invalid Google token" });
        }

        const { email, name, picture, sub } = payload;

        if (!email) {
            return res.status(400).json({ message: "Email is required from Google account" });
        }

        // 🔎 Check if user already exists
        let user = await User.findOne({ email });

        if (!user) {
            // 🆕 Create a new Google user (password not required)
            user = new User({
                name,
                email,
                picture,
                googleId: sub,
                isGoogleAccount: true,
                password: "google_oauth_user", // dummy value to satisfy schema
            });

            await user.save();

            // 📨 Send welcome notification
            await createNotification({
                userId: user._id.toString(),
                title: "Welcome to LeafLine 🎉",
                message: `Hi ${user.name}, your account has been created successfully with Google.`,
                icon: "✨",
            });
        }

        // 🔑 Generate JWT token
        const jwtToken = generateToken(user._id.toString(), user.role);

        // ✅ Response
        res.status(200).json({
            message: "Google authentication successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture,
                role: user.role,
                isGoogleAccount: user.isGoogleAccount,
            },
            token: jwtToken,
        });
    } catch (error) {
        console.error("❌ Google Auth Error:", error);
        res.status(500).json({
            message: "Google authentication failed",
            error: (error as Error).message,
        });
    }
};

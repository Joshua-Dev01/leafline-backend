import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model";
import { createNotification } from "../../services/Notifications/services/notification.service";
import { generateToken } from "../utils/generateToken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Google token missing" });
        }

        // Verify the token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(400).json({ message: "Invalid Google token" });
        }

        const { email, name, picture, sub } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                name,
                email,
                picture,
                googleId: sub,
                isGoogleAccount: true,
            });

            await createNotification({
                userId: user._id.toString(),
                title: "Welcome to LeafLine 🎉",
                message: `Hi ${user.name}, your account has been created successfully with Google.`,
                icon: "✨",
            });
        }

        const jwtToken = generateToken(user._id.toString(), user.role);

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
        console.error("Google Auth Error:", error);
        res.status(500).json({
            message: "Google authentication failed",
            error: (error as Error).message,
        });
    }
};

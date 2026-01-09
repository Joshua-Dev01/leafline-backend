import { Request, Response, NextFunction } from "express";
import { UserSubscription } from "../model/userSubscription.model";

export const checkLimit = (type: "notes" | "events" | "projects" | "community") => {
    return async (req: any, res: Response, next: NextFunction) => {
        if (req.user.role === "admin") return next(); // Admin unlimited

        const subscription = await UserSubscription.findOne({ user: req.user.id }).populate("plan");
        if (!subscription) return res.status(403).json({ message: "Subscribe to a plan first" });

        const remaining = {
            notes: subscription.remainingNotes,
            events: subscription.remainingEvents,
            projects: subscription.remainingProjects,
            community: subscription.remainingCommunityPosts,
        }[type];

        if (remaining <= 0) {
            return res.status(403).json({ message: `You have reached your ${type} limit. Upgrade your plan.` });
        }

        req.subscription = subscription; // save subscription to decrement later
        next();
    };
};

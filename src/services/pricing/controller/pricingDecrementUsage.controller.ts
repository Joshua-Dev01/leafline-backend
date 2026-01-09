import { UserSubscription } from "../model/userSubscription.model";

export const decrementUsage = async (req: any, type: "notes" | "events" | "projects" | "community") => {
    const subscription = req.subscription;
    if (!subscription) return;

    switch (type) {
        case "notes": subscription.remainingNotes -= 1; break;
        case "events": subscription.remainingEvents -= 1; break;
        case "projects": subscription.remainingProjects -= 1; break;
        case "community": subscription.remainingCommunityPosts -= 1; break;
    }

    await subscription.save();
};

import mongoose, { Schema, Document } from "mongoose";
import { PlanDuration } from "./pricing.model";

export interface IUserSubscription extends Document {
    user: mongoose.Types.ObjectId;
    plan: mongoose.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    duration: PlanDuration;
    remainingNotes: number;
    remainingEvents: number;
    remainingProjects: number;
    remainingCommunityPosts: number;
}

const userSubscriptionSchema = new Schema<IUserSubscription>({
    user: { type: Schema.Types.ObjectId, ref: "LeafLineUser", required: true },
    plan: { type: Schema.Types.ObjectId, ref: "Pricing", required: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    duration: { type: String, enum: ["free", "monthly", "yearly"], required: true },
    remainingNotes: { type: Number, default: 5 },
    remainingEvents: { type: Number, default: 5 },
    remainingProjects: { type: Number, default: 5 },
    remainingCommunityPosts: { type: Number, default: 5 },
}, { timestamps: true });

export const UserSubscription = mongoose.model<IUserSubscription>("UserSubscription", userSubscriptionSchema);

import mongoose from "mongoose";

interface IPlan {
    name: string;
    price: number; // in kobo
    notesLimit: number;
    projectsLimit: number;
    communitiesLimit: number;
    eventsLimit: number;
    storageLimit: number; // in MB
    isActive: boolean;
}

const planSchema = new mongoose.Schema<IPlan>({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    notesLimit: { type: Number, required: true },
    projectsLimit: { type: Number, required: true },
    communitiesLimit: { type: Number, required: true },
    eventsLimit: { type: Number, required: true },
    storageLimit: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
});

export const Plan = mongoose.model<IPlan>("Plan", planSchema);

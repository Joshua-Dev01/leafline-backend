import mongoose, { Schema, Document } from "mongoose";

export interface IEmailVerification extends Document {
    userId: mongoose.Types.ObjectId;
    code: string;
    expiresAt: Date;
    verified: boolean;
}

const emailVerificationSchema = new Schema<IEmailVerification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "LeafLineUser", required: true },
        code: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        verified: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const EmailVerification = mongoose.model<IEmailVerification>(
    "EmailVerification",
    emailVerificationSchema
);

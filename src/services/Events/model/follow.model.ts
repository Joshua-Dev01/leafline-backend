import mongoose, { Schema, Document } from "mongoose";

/** `followerId` follows organizer `followeeId` and gets notified of their new events. */
export interface IFollow extends Document {
  followerId: mongoose.Types.ObjectId;
  followeeId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const followSchema = new Schema<IFollow>(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: "LeafLineUser",
      required: true,
    },
    followeeId: {
      type: Schema.Types.ObjectId,
      ref: "LeafLineUser",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

followSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });
followSchema.index({ followeeId: 1 });

export const Follow = mongoose.model<IFollow>("Follow", followSchema);

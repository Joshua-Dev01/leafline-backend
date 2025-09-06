import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    booksRead: { type: Number, default: 0 },
    readingHours: { type: Number, default: 0 },
    booksDownloaded: { type: Number, default: 0 },
    audiobooks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Analytics = mongoose.model("Analytics", analyticsSchema);

import mongoose, { Schema, Document } from "mongoose";

export interface ILibraryBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  resourceId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const bookmarkSchema = new Schema<ILibraryBookmark>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "LeafLineUser", required: true },
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: "LibraryResource",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One bookmark per user per resource.
bookmarkSchema.index({ userId: 1, resourceId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, createdAt: -1 });

export const LibraryBookmark = mongoose.model<ILibraryBookmark>(
  "LibraryBookmark",
  bookmarkSchema
);
import mongoose, { Schema, Document } from "mongoose";

/** A host announcement on an event page ("venue moved to Hall B"). */
export interface IEventUpdate extends Document {
  eventId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  text: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventUpdateSchema = new Schema<IEventUpdate>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "LeafLineUser",
      required: true,
    },
    authorName: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    pinned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

eventUpdateSchema.index({ eventId: 1, pinned: -1, createdAt: -1 });

export const EventUpdate = mongoose.model<IEventUpdate>(
  "EventUpdate",
  eventUpdateSchema,
);

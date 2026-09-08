import mongoose, { Schema, Document } from "mongoose";

export type EventStatus   = "upcoming" | "live" | "ended";
export type EventCategory =
  | "Academic"
  | "Campus Life"
  | "Career"
  | "Competition"
  | "Social"
  | "Cultural"
  | "Sports"
  | "Other";
export type EventMode = "physical" | "online" | "hybrid";

export interface IEvent extends Document {
  title:          string;
  description:    string;
  category:       EventCategory;
  mode:           EventMode;
  image?:         string;
  imagePublicId?: string;          // Cloudinary public_id for deletion

  // Creator
  createdBy:      mongoose.Types.ObjectId;
  creatorName:    string;

  // Schedule
  date:           Date;            // main event date (used for status calc)
  startTime:      Date;
  endTime?:       Date;

  // Location
  location?:      string;          // physical address / room
  onlineLink?:    string;          // Zoom / Google Meet / etc.

  // Capacity
  capacity?:      number;          // null = unlimited

  // Engagement
  interestedUsers: mongoose.Types.ObjectId[];
  goingUsers:      mongoose.Types.ObjectId[];

  // Notifications
  reminderSent:   boolean;

  // Timestamps
  createdAt:      Date;
  updatedAt:      Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title:         { type: String, required: true, trim: true, maxlength: 120 },
    description:   { type: String, required: true, trim: true, maxlength: 2000 },
    category:      {
      type: String,
      enum: ["Academic", "Campus Life", "Career", "Competition", "Social", "Cultural", "Sports", "Other"],
      required: true,
    },
    mode:          { type: String, enum: ["physical", "online", "hybrid"], default: "physical" },
    image:         { type: String },
    imagePublicId: { type: String },

    createdBy:    { type: Schema.Types.ObjectId, ref: "LeafLineUser", required: true },
    creatorName:  { type: String, required: true },

    date:      { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime:   { type: Date },

    location:   { type: String, trim: true },
    onlineLink: { type: String, trim: true },

    capacity: { type: Number, min: 1 },

    interestedUsers: [{ type: Schema.Types.ObjectId, ref: "LeafLineUser" }],
    goingUsers:      [{ type: Schema.Types.ObjectId, ref: "LeafLineUser" }],

    reminderSent: { type: Boolean, default: false },
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
    toObject: { virtuals: true },
  }
);

// ── Indexes for fast queries ─────────────────────────────────────────
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ title: "text", description: "text" }); // full-text search

// ── Virtual: computed status ─────────────────────────────────────────
eventSchema.virtual("status").get(function (): EventStatus {
  const now      = new Date();
  const start    = this.startTime;
  const end      = this.endTime;

  if (end && now > end)   return "ended";
  if (now >= start)       return "live";
  return "upcoming";
});

// ── Virtual: spots left ──────────────────────────────────────────────
eventSchema.virtual("spotsLeft").get(function () {
  if (!this.capacity) return null;
  return Math.max(this.capacity - this.goingUsers.length, 0);
});

// ── Virtual: is full ────────────────────────────────────────────────
eventSchema.virtual("isFull").get(function () {
  if (!this.capacity) return false;
  return this.goingUsers.length >= this.capacity;
});

export const Event = mongoose.model<IEvent>("Event", eventSchema);
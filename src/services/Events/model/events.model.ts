import mongoose, { Schema, Document } from "mongoose";

export type EventStatus = "upcoming" | "live" | "ended" | "cancelled";

export const EVENT_CATEGORIES = [
  "Academic",
  "Campus Life",
  "Career",
  "Competition",
  "Social",
  "Cultural",
  "Sports",
  "Other",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_MODES = ["physical", "online", "hybrid"] as const;
export type EventMode = (typeof EVENT_MODES)[number];

/** When an event has no endTime we treat it as lasting this long. */
export const DEFAULT_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;
/** Max co-hosts per event (in addition to the creator). */
export const MAX_COHOSTS = 5;

export interface IEvent extends Document {
  title: string;
  description: string;
  category: EventCategory;
  mode: EventMode;
  image?: string;
  imagePublicId?: string; // Cloudinary public_id for deletion

  // Hosts
  createdBy: mongoose.Types.ObjectId;
  creatorName: string;
  coHosts: mongoose.Types.ObjectId[];

  // Schedule
  date: Date; // start day (UTC midnight) — kept for backwards compatibility
  startTime: Date;
  endTime?: Date;
  endsAt: Date; // endTime, or startTime + default duration. Always set.

  // Location
  location?: string;
  onlineLink?: string;

  // Capacity
  capacity?: number; // unset = unlimited

  // Engagement (arrays are the source of truth, counts are for sorting/UI)
  interestedUsers: mongoose.Types.ObjectId[];
  goingUsers: mongoose.Types.ObjectId[];
  waitlistUsers: mongoose.Types.ObjectId[]; // FIFO
  interestedCount: number;
  goingCount: number;
  waitlistCount: number;

  // Cancellation
  cancelledAt?: Date;
  cancelReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;

  // Reminders already sent
  reminders: { h24: boolean; h1: boolean };

  createdAt: Date;
  updatedAt: Date;

  // virtuals
  status: EventStatus;
  spotsLeft: number | null;
  isFull: boolean;
}

/** `date` (UTC day) and `endsAt` derived from the start/end the host entered. */
export const deriveSchedule = (startTime: Date, endTime?: Date | null) => ({
  date: new Date(
    Date.UTC(
      startTime.getUTCFullYear(),
      startTime.getUTCMonth(),
      startTime.getUTCDate(),
    ),
  ),
  endsAt: endTime ?? new Date(startTime.getTime() + DEFAULT_EVENT_DURATION_MS),
});

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: EVENT_CATEGORIES, required: true },
    mode: { type: String, enum: EVENT_MODES, default: "physical" },
    image: { type: String },
    imagePublicId: { type: String },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "LeafLineUser",
      required: true,
    },
    creatorName: { type: String, required: true },
    coHosts: [{ type: Schema.Types.ObjectId, ref: "LeafLineUser" }],

    date: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    endsAt: { type: Date, required: true },

    location: { type: String, trim: true },
    onlineLink: { type: String, trim: true },

    capacity: { type: Number, min: 1 },

    interestedUsers: [{ type: Schema.Types.ObjectId, ref: "LeafLineUser" }],
    goingUsers: [{ type: Schema.Types.ObjectId, ref: "LeafLineUser" }],
    waitlistUsers: [{ type: Schema.Types.ObjectId, ref: "LeafLineUser" }],
    interestedCount: { type: Number, default: 0, min: 0 },
    goingCount: { type: Number, default: 0, min: 0 },
    waitlistCount: { type: Number, default: 0, min: 0 },

    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true, maxlength: 500 },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "LeafLineUser" },

    reminders: {
      h24: { type: Boolean, default: false },
      h1: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.imagePublicId;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// Keep date/endsAt in step whenever a document is created or re-saved.
eventSchema.pre("validate", function (next) {
  if (this.startTime && (this.isNew || this.isModified("startTime") || this.isModified("endTime"))) {
    const { date, endsAt } = deriveSchedule(this.startTime, this.endTime);
    this.date = date;
    this.endsAt = endsAt;
  }
  next();
});

// ── Indexes ──────────────────────────────────────────────────────────
eventSchema.index({ startTime: 1 });
eventSchema.index({ endsAt: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ coHosts: 1 });
eventSchema.index({ goingUsers: 1 });
eventSchema.index({ goingCount: -1, startTime: 1 });
eventSchema.index({ title: "text", description: "text" }); // full-text search

// ── Virtuals ─────────────────────────────────────────────────────────
eventSchema.virtual("status").get(function (): EventStatus {
  if (this.cancelledAt) return "cancelled";
  const now = Date.now();
  const start = this.startTime.getTime();
  const end = (
    this.endsAt ??
    this.endTime ??
    new Date(start + DEFAULT_EVENT_DURATION_MS)
  ).getTime();
  if (now > end) return "ended";
  if (now >= start) return "live";
  return "upcoming";
});

eventSchema.virtual("spotsLeft").get(function () {
  if (!this.capacity) return null;
  return Math.max(this.capacity - this.goingUsers.length, 0);
});

eventSchema.virtual("isFull").get(function () {
  if (!this.capacity) return false;
  return this.goingUsers.length >= this.capacity;
});

export const Event = mongoose.model<IEvent>("Event", eventSchema);

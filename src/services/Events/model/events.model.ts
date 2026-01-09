import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description: string;
  topic?: string;
  image?: string;
  createdBy: mongoose.Types.ObjectId;
  creatorName: string;
  date: Date;
  startDate: Date;  // Added for analytics
  endDate: Date;    // Added for analytics
  location?: string;
  interestedUsers: mongoose.Types.ObjectId[];
  goingUsers: mongoose.Types.ObjectId[];
  status: "upcoming" | "ongoing" | "ended";
  reminderSent: boolean;
  reminderScheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    topic: String,
    image: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "LeafLineUser", required: true },
    creatorName: { type: String, required: true },
    date: { type: Date, required: true },
    startDate: { type: Date },  // Optional: For events with specific start time
    endDate: { type: Date },    // Optional: For events with specific end time
    location: String,
    interestedUsers: [{ type: Schema.Types.ObjectId, ref: "LeafLineUser" }],
    goingUsers: [{ type: Schema.Types.ObjectId, ref: "LeafLineUser" }],
    status: { type: String, enum: ["upcoming", "ongoing", "ended"], default: "upcoming" },
    reminderSent: { type: Boolean, default: false },
    reminderScheduledAt: { type: Date },
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

// Virtual for calculating engagement rate
eventSchema.virtual("engagementRate").get(function () {
  const total = this.interestedUsers.length + this.goingUsers.length;
  return total;
});

// Virtual for conversion rate (interested -> going)
eventSchema.virtual("conversionRate").get(function () {
  if (this.interestedUsers.length === 0) return 0;
  return Math.round((this.goingUsers.length / this.interestedUsers.length) * 100 * 10) / 10;
});

export const Event = mongoose.model<IEvent>("Event", eventSchema);
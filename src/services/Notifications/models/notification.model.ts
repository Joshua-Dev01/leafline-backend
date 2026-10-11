import { Schema, model, Document } from "mongoose";
import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TYPES,
  NotificationPriority,
  NotificationType,
} from "../notification.constants";

export interface INotification extends Document {
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string; // in-app path the notification links to, e.g. /dashboard/library
  actionLabel?: string; // label for the primary action button
  meta?: Record<string, unknown>; // ids etc. (eventId, resourceId, ...)
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "system",
    },
    priority: {
      type: String,
      enum: NOTIFICATION_PRIORITIES,
      default: "normal",
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    icon: { type: String },
    actionUrl: { type: String, maxlength: 300 },
    actionLabel: { type: String, maxlength: 40 },
    meta: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

// Feed: newest first, optionally filtered by read state or type.
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const Notification = model<INotification>(
  "Notification",
  notificationSchema
);

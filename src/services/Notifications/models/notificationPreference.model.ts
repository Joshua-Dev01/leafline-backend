import { Schema, model, Document } from "mongoose";
import { NOTIFICATION_TYPES, NotificationType } from "../notification.constants";

export interface INotificationPreference extends Document {
  userId: string;
  // Which categories the user wants delivered to their in-app feed.
  inApp: Record<NotificationType, boolean>;
}

const inAppShape = Object.fromEntries(
  NOTIFICATION_TYPES.map((t) => [t, { type: Boolean, default: true }])
);

const notificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: { type: String, required: true, unique: true },
    inApp: { type: new Schema(inAppShape, { _id: false }), default: () => ({}) },
  },
  { timestamps: true }
);

export const NotificationPreference = model<INotificationPreference>(
  "NotificationPreference",
  notificationPreferenceSchema
);

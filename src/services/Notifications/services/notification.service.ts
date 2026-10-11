// src/services/Notifications/services/notification.service.ts
import { Notification } from "../models/notification.model";
import { NotificationPreference } from "../models/notificationPreference.model";
import {
  NotificationPriority,
  NotificationType,
  UNMUTABLE_TYPES,
} from "../notification.constants";

export interface NotifyContent {
  title: string;
  message: string;
  type?: NotificationType; // defaults to "system"
  priority?: NotificationPriority; // defaults to "normal"
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
  meta?: Record<string, unknown>;
}

export interface NotifyOptions extends NotifyContent {
  userId: string;
}

export interface NotifyManyOptions extends NotifyContent {
  userIds: string[];
}

/** User ids (out of `userIds`) who switched this category off. */
const getMutedUserIds = async (
  userIds: string[],
  type: NotificationType
): Promise<Set<string>> => {
  if (UNMUTABLE_TYPES.includes(type) || userIds.length === 0) return new Set();
  const muted = await NotificationPreference.find({
    userId: { $in: userIds },
    [`inApp.${type}`]: false,
  })
    .select("userId")
    .lean();
  return new Set(muted.map((p) => p.userId));
};

/**
 * Create one notification. Never throws: a failed notification must not break
 * the action that triggered it. Returns null when skipped or on failure.
 */
export const createNotification = async ({
  userId,
  type = "system",
  priority = "normal",
  ...content
}: NotifyOptions) => {
  try {
    const muted = await getMutedUserIds([userId], type);
    if (muted.has(userId)) return null;

    return await Notification.create({ userId, type, priority, ...content });
  } catch (error) {
    console.error("❌ Notification creation failed:", error);
    return null;
  }
};

/** Create the same notification for many users (de-duplicated, mute-aware). */
export const createManyNotifications = async ({
  userIds,
  type = "system",
  priority = "normal",
  ...content
}: NotifyManyOptions) => {
  try {
    const unique = [...new Set(userIds)];
    const muted = await getMutedUserIds(unique, type);
    const receivers = unique.filter((id) => !muted.has(id));
    if (receivers.length === 0) return 0;

    const docs = await Notification.insertMany(
      receivers.map((userId) => ({ userId, type, priority, ...content }))
    );
    return docs.length;
  } catch (error) {
    console.error("❌ Bulk notification creation failed:", error);
    return 0;
  }
};

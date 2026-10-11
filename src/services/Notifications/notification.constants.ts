// Single source of truth for notification vocabulary.
// The frontend mirrors these in src/pages/Dashboard/notifications/interface/notificationTypes.ts

export const NOTIFICATION_TYPES = [
  "event", // event reminders, RSVPs
  "library", // resource uploads, approvals, moderation
  "note", // notes and subjects
  "ai", // AI study assistant output
  "project", // project activity
  "system", // account / platform messages (cannot be muted)
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_PRIORITIES = ["low", "normal", "high"] as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

// Types a user is not allowed to switch off.
export const UNMUTABLE_TYPES: readonly NotificationType[] = ["system"];

export const isNotificationType = (value: unknown): value is NotificationType =>
  typeof value === "string" &&
  (NOTIFICATION_TYPES as readonly string[]).includes(value);

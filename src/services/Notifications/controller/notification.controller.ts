import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { INotification, Notification } from "../models/notification.model";
import { NotificationPreference } from "../models/notificationPreference.model";
import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TYPES,
  NotificationPriority,
  NotificationType,
  UNMUTABLE_TYPES,
  isNotificationType,
} from "../notification.constants";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Stable public shape. Older documents may lack the newer fields. */
const serialize = (n: INotification) => ({
  id: String(n._id),
  type: n.type ?? "system",
  priority: n.priority ?? "normal",
  title: n.title,
  message: n.message,
  icon: n.icon ?? null,
  actionUrl: n.actionUrl ?? null,
  actionLabel: n.actionLabel ?? null,
  meta: n.meta ?? null,
  read: Boolean(n.read),
  readAt: n.readAt ?? null,
  createdAt: n.createdAt,
});

const getUserId = (req: Request, res: Response): string | null => {
  const id = req.user?.id;
  if (!id) {
    res.status(401).json({ message: "Unauthorized: user not found" });
    return null;
  }
  return id;
};

const parsePositiveInt = (value: unknown, fallback: number) => {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** GET /notifications?type=&priority=&unread=true&page=1&limit=20 */
export const getUserNotifications = async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { type, unread, priority } = req.query;
  if (type !== undefined && !isNotificationType(type)) {
    return res.status(400).json({
      message: `Invalid type. Use one of: ${NOTIFICATION_TYPES.join(", ")}`,
    });
  }

  if (
    priority !== undefined &&
    !(NOTIFICATION_PRIORITIES as readonly string[]).includes(String(priority))
  ) {
    return res.status(400).json({
      message: `Invalid priority. Use one of: ${NOTIFICATION_PRIORITIES.join(", ")}`,
    });
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);

  const filter: Record<string, unknown> = { userId };
  if (type) filter.type = type;
  if (priority) filter.priority = priority as NotificationPriority;
  if (unread === "true") filter.read = false;

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<INotification[]>(),
    Notification.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return res.status(200).json({
    data: items.map(serialize),
    pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
  });
};

/** GET /notifications/summary → counts used by the bell badge and filter tabs */
export const getNotificationSummary = async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const rows = await Notification.aggregate<{
    _id: { type?: NotificationType; read?: boolean };
    count: number;
  }>([
    { $match: { userId } },
    { $group: { _id: { type: "$type", read: "$read" }, count: { $sum: 1 } } },
  ]);

  const byType = Object.fromEntries(
    NOTIFICATION_TYPES.map((t) => [t, { total: 0, unread: 0 }])
  ) as Record<NotificationType, { total: number; unread: number }>;

  let total = 0;
  let unread = 0;
  for (const row of rows) {
    const t: NotificationType = row._id.type ?? "system";
    const isUnread = !row._id.read;
    byType[t].total += row.count;
    total += row.count;
    if (isUnread) {
      byType[t].unread += row.count;
      unread += row.count;
    }
  }

  return res.status(200).json({ total, unread, byType });
};

/** PUT /notifications/:id/read */
export const markAsRead = async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid notification id" });
  }

  const updated = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { read: true, readAt: new Date() },
    { new: true }
  ).lean<INotification>();

  if (!updated) return res.status(404).json({ message: "Notification not found" });
  return res.status(200).json({ message: "Notification marked as read", data: serialize(updated) });
};

/** PUT /notifications/:id/unread */
export const markAsUnread = async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid notification id" });
  }

  const updated = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { read: false, $unset: { readAt: 1 } },
    { new: true }
  ).lean<INotification>();

  if (!updated) return res.status(404).json({ message: "Notification not found" });
  return res.status(200).json({ message: "Notification marked as unread", data: serialize(updated) });
};

/** PUT /notifications/mark-all-read   body: { type? } */
export const markAllAsRead = async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const type = req.body?.type;
  if (type !== undefined && !isNotificationType(type)) {
    return res.status(400).json({ message: "Invalid type" });
  }

  const filter: Record<string, unknown> = { userId, read: false };
  if (type) filter.type = type;

  const result = await Notification.updateMany(filter, {
    read: true,
    readAt: new Date(),
  });
  return res.status(200).json({
    message: "All notifications marked as read",
    modified: result.modifiedCount,
  });
};

/** DELETE /notifications/:id */
export const deleteNotification = async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid notification id" });
  }

  const deleted = await Notification.findOneAndDelete({ _id: id, userId });
  if (!deleted) return res.status(404).json({ message: "Notification not found" });
  return res.status(200).json({ message: "Notification deleted" });
};

/** DELETE /notifications/clear-read → removes every already-read notification */
export const clearReadNotifications = async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const result = await Notification.deleteMany({ userId, read: true });
  return res.status(200).json({
    message: "Read notifications cleared",
    deleted: result.deletedCount,
  });
};

const preferenceResponse = (inApp: Partial<Record<NotificationType, boolean>> = {}) => ({
  inApp: Object.fromEntries(
    NOTIFICATION_TYPES.map((t) => [t, inApp[t] !== false])
  ) as Record<NotificationType, boolean>,
  locked: [...UNMUTABLE_TYPES],
});

/** GET /notifications/preferences */
export const getPreferences = async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const prefs = await NotificationPreference.findOne({ userId }).lean();
  return res.status(200).json(preferenceResponse(prefs?.inApp));
};

/** PUT /notifications/preferences   body: { inApp: { event?: boolean, ... } } */
export const updatePreferences = async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const incoming = req.body?.inApp;
  if (!incoming || typeof incoming !== "object") {
    return res.status(400).json({ message: "Body must be { inApp: { <type>: boolean } }" });
  }

  const $set: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (!isNotificationType(key) || typeof value !== "boolean") {
      return res.status(400).json({ message: `Invalid preference: ${key}` });
    }
    if (UNMUTABLE_TYPES.includes(key)) continue; // silently keep locked types on
    $set[`inApp.${key}`] = value;
  }

  const prefs = await NotificationPreference.findOneAndUpdate(
    { userId },
    { $set, $setOnInsert: { userId } },
    { new: true, upsert: true }
  ).lean();

  return res.status(200).json(preferenceResponse(prefs?.inApp));
};

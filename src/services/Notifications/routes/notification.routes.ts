// src/services/Notifications/routes/notification.routes.ts
import express from "express";

import { protect } from "../../../MainAuth/middleware/protect";
import {
  clearReadNotifications,
  deleteNotification,
  getNotificationSummary,
  getPreferences,
  getUserNotifications,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  updatePreferences,
} from "../controller/notification.controller";
import catchAsync from "../../../utils/catchAsync";

const NotificationsRouter = express.Router();

NotificationsRouter.use(catchAsync(protect));

// Fixed paths first, then the `/:id` routes.
NotificationsRouter.get("/", catchAsync(getUserNotifications));
NotificationsRouter.get("/summary", catchAsync(getNotificationSummary));
NotificationsRouter.get("/preferences", catchAsync(getPreferences));
NotificationsRouter.put("/preferences", catchAsync(updatePreferences));
NotificationsRouter.put("/mark-all-read", catchAsync(markAllAsRead));
NotificationsRouter.delete("/clear-read", catchAsync(clearReadNotifications));

NotificationsRouter.put("/:id/read", catchAsync(markAsRead));
NotificationsRouter.put("/:id/unread", catchAsync(markAsUnread));
NotificationsRouter.delete("/:id", catchAsync(deleteNotification));

export default NotificationsRouter;

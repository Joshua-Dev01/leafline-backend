// src/routes/notification.routes.ts
import express from "express";

import { protect } from "../../../MainAuth/middleware/protect";
import {
  deleteNotification,
  getUserNotifications,
  markAllAsRead,
  markAsRead,
} from "../controller/notification.controller";
import catchAsync from "../../../utils/catchAsync";

const NotificationsRouter = express.Router();

NotificationsRouter.use(catchAsync(protect));

NotificationsRouter.get("/", catchAsync(getUserNotifications));
NotificationsRouter.put("/:id/read", markAsRead);
NotificationsRouter.put("/mark-all-read", catchAsync(markAllAsRead));
NotificationsRouter.delete("/:id", deleteNotification);

export default NotificationsRouter;

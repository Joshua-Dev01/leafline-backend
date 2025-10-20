// src/services/notification.service.ts
import { Notification } from "../models/notification.model";

interface NotifyOptions {
  userId: string;
  title: string;
  message: string;
  icon?: string;
}

export const createNotification = async ({
  userId,
  title,
  message,
  icon,
}: NotifyOptions) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      icon,
    });
    console.log("✅ Notification created:", notification);
    return notification;
  } catch (error) {
    console.error("❌ Notification creation failed:", error);
  }
};

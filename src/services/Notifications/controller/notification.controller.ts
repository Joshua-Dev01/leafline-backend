
import { Request, Response } from "express";
import { Notification } from "../models/notification.model";

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ message: "Unauthorized: No user found" });

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications", error: err });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  await Notification.findByIdAndUpdate(id, { read: true });
  res.json({ message: "Notification marked as read" });
};

export const markAllAsRead = async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Unauthorized: user not found" });
  }
  const userId = req.user.id;
  await Notification.updateMany({ userId, read: false }, { read: true });
  res.json({ message: "All notifications marked as read" });
};

export const deleteNotification = async (req: Request, res: Response) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ message: "Notification deleted" });
};

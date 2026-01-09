import mongoose from "mongoose";
import { Event, IEvent } from "../model/events.model";
import { Notification } from "../../Notifications/models/notification.model";

export const sendEventReminder = async (eventId: string): Promise<void> => {
    try {
        const event: IEvent | null = await Event.findById(eventId);
        if (!event) return;

        // Merge interestedUsers and goingUsers, remove duplicates
        const receivers = Array.from(
            new Set([
                ...event.interestedUsers.map((id) => id.toString()),
                ...event.goingUsers.map((id) => id.toString()),
            ])
        );

        if (receivers.length > 0) {
            await Notification.insertMany(
                receivers.map((userId) => ({
                    userId: new mongoose.Types.ObjectId(userId),
                    title: "Event Reminder",
                    message: `Reminder: '${event.title}' is happening in less than 24 hours!`,
                    type: "event",
                }))
            );
        }

        event.reminderSent = true;
        await event.save();

        console.log(`✅ 24h reminder sent for event: ${event.title}`);
    } catch (err) {
        console.error("Error sending event reminder:", err);
    }
};

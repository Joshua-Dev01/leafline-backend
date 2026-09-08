import cron from "node-cron";
import { Notification } from "../../Notifications/models/notification.model";
import { Event } from "../model/events.model";

/**
 * Runs every hour.
 * Sends a reminder notification to all interested + going users
 * for events starting within the next 24 hours.
 */
export const scheduleEventReminders = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const now         = new Date();
      const in24Hours   = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const events = await Event.find({
        startTime:    { $gte: now, $lte: in24Hours },
        reminderSent: false,
      });

      for (const event of events) {
        // Merge interested + going, remove duplicates
        const receiverSet = new Set([
          ...event.interestedUsers.map((id) => id.toString()),
          ...event.goingUsers.map((id)      => id.toString()),
        ]);

        if (receiverSet.size > 0) {
          await Notification.insertMany(
            [...receiverSet].map((userId) => ({
              userId,
              title:   "Event Reminder 🔔",
              message: `"${event.title}" starts in less than 24 hours!`,
              type:    "event",
              meta:    { eventId: event._id },
            }))
          );
        }

        event.reminderSent = true;
        await event.save();
      }

      console.log(`✅ Event reminders sent for ${events.length} event(s)`);
    } catch (err) {
      console.error("❌ Reminder cron error:", err);
    }
  });
};
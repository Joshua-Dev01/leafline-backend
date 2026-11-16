import cron from "node-cron";
import { Event } from "../model/events.model";
import { createManyNotifications } from "../../Notifications/services/notification.service";
import { dashboardEventPath } from "../utils/events.helpers";
import { clip } from "../utils/notify";

type Window = "h24" | "h1";

const WINDOWS: Record<Window, { ms: number; title: string }> = {
  h24: { ms: 24 * 60 * 60 * 1000, title: "Event reminder" },
  h1: { ms: 60 * 60 * 1000, title: "Starting soon" },
};

const humanizeUntil = (ms: number) => {
  const mins = Math.max(Math.round(ms / 60000), 1);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
};

/**
 * Send one kind of reminder ("h24" or "h1") for every event that is inside
 * its window and hasn't had that reminder yet. Cancelled events are skipped.
 *
 * Each event is "claimed" with an atomic update before notifying, so even if
 * the server runs twice (or two ticks overlap) nobody is reminded twice.
 */
export const sendDueReminders = async (
  window: Window,
  now: Date = new Date(),
): Promise<number> => {
  const { ms, title } = WINDOWS[window];
  const flag = `reminders.${window}`;

  const due = await Event.find({
    startTime: { $gt: now, $lte: new Date(now.getTime() + ms) },
    cancelledAt: null,
    [flag]: { $ne: true },
  }).select("_id");

  let sent = 0;
  for (const { _id } of due) {
    // claim: only one process wins
    const event = await Event.findOneAndUpdate(
      { _id, [flag]: { $ne: true }, cancelledAt: null },
      { $set: { [flag]: true } },
      { new: true },
    );
    if (!event) continue;

    const receivers = [
      ...new Set([
        ...event.goingUsers.map(String),
        ...event.interestedUsers.map(String),
      ]),
    ];
    if (receivers.length === 0) continue;

    await createManyNotifications({
      userIds: receivers,
      type: "event",
      priority: "high",
      title,
      message: `"${clip(event.title, 100)}" starts in about ${humanizeUntil(
        event.startTime.getTime() - now.getTime(),
      )}.`,
      actionUrl: dashboardEventPath(event.id),
      actionLabel: "View event",
      meta: { eventId: event.id, reminder: window },
    });
    sent++;
  }

  return sent;
};

let started = false;

/**
 * Every 10 minutes: 24-hour and 1-hour reminders.
 * (The 1-hour reminder needs a tighter schedule than the old hourly job.)
 */
export const scheduleEventReminders = () => {
  if (started) return;
  started = true;

  cron.schedule("*/10 * * * *", async () => {
    try {
      const [day, hour] = [
        await sendDueReminders("h24"),
        await sendDueReminders("h1"),
      ];
      if (day || hour)
        console.log(`✅ Event reminders sent — 24h: ${day}, 1h: ${hour}`);
    } catch (err) {
      console.error("❌ Reminder cron error:", err);
    }
  });
};

/**
 * Kept so the (unused) config/agenda.ts keeps type-checking.
 * Sends the 24h reminder for one event if it is still due.
 */
export const sendEventReminder = async (_eventId: string) =>
  sendDueReminders("h24");

import { Event, DEFAULT_EVENT_DURATION_MS } from "../model/events.model";

/**
 * Upgrades events saved before the v2 model (idempotent, safe to run on every
 * start). Adds endsAt, counters, waitlist/coHosts arrays and the new reminder
 * flags, and drops the old `reminderSent`.
 *
 * Runs automatically once the DB connection opens (see server.ts) and can be
 * run by hand with `npm run migrate:events`.
 */
export const backfillEventsV2 = async (): Promise<number> => {
  const filter = { endsAt: { $exists: false } };
  const pending = await Event.collection.countDocuments(filter);
  if (pending === 0) return 0;

  const now = new Date();
  const size = (field: string) => ({ $size: { $ifNull: [field, []] } });

  await Event.collection.updateMany(filter, [
    {
      $set: {
        goingUsers: { $ifNull: ["$goingUsers", []] },
        interestedUsers: { $ifNull: ["$interestedUsers", []] },
        waitlistUsers: [],
        coHosts: [],
        goingCount: size("$goingUsers"),
        interestedCount: size("$interestedUsers"),
        waitlistCount: 0,
        endsAt: {
          $ifNull: ["$endTime", { $add: ["$startTime", DEFAULT_EVENT_DURATION_MS] }],
        },
        // events that already started must never fire a "starts soon" reminder
        reminders: {
          h24: {
            $or: [{ $ifNull: ["$reminderSent", false] }, { $lt: ["$startTime", now] }],
          },
          h1: { $lt: ["$startTime", now] },
        },
      },
    },
    { $unset: "reminderSent" },
  ]);

  console.log(`✅ Events backfill: upgraded ${pending} event(s) to v2`);
  return pending;
};

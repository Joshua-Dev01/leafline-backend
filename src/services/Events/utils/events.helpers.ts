import mongoose from "mongoose";
import { IEvent } from "../model/events.model";

/* ── Ids ─────────────────────────────────────────────────────────── */
export const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

const idsOf = (arr?: unknown[]): string[] => (arr ?? []).map((x) => String(x));

/** Creator + co-hosts. */
export const hostIds = (event: Pick<IEvent, "createdBy" | "coHosts">) => [
  String(event.createdBy),
  ...idsOf(event.coHosts),
];

export const isHost = (
  event: Pick<IEvent, "createdBy" | "coHosts">,
  userId?: string,
) => !!userId && hostIds(event).includes(userId);

export const isCreator = (event: Pick<IEvent, "createdBy">, userId?: string) =>
  !!userId && String(event.createdBy) === userId;

/* ── Capacity ────────────────────────────────────────────────────── */
/**
 * Query fragment: "this event still has a free spot".
 * Used inside findOneAndUpdate so the capacity check and the join happen in
 * ONE atomic step (no overbooking when two people tap "Going" together).
 */
export const hasFreeSpot = () => ({
  $or: [
    { capacity: null }, // unset = unlimited
    {
      $expr: {
        $lt: [{ $size: { $ifNull: ["$goingUsers", []] } }, "$capacity"],
      },
    },
  ],
});

/* ── Frontend links ──────────────────────────────────────────────── */
export const frontendBaseUrl = () =>
  (
    process.env.FRONTEND_URL ??
    process.env.CLIENT_URLS?.split(",")[0]?.trim() ??
    "https://leafline.vercel.app"
  ).replace(/\/$/, "");

/** Public page for sharing. */
export const publicEventUrl = (id: string) => `${frontendBaseUrl()}/events/${id}`;
/** In-app path used by notifications. */
export const dashboardEventPath = (id: string) => `/dashboard/events/${id}`;

/* ── Serialization ───────────────────────────────────────────────── */
// Set EVENT_EXPOSE_RSVP_IDS=false once the frontend reads the counts + `viewer`
// flags instead of the going/interested arrays: non-hosts then stop receiving
// every attendee's user id.
const exposeRsvpIds = () => process.env.EVENT_EXPOSE_RSVP_IDS !== "false";

/**
 * Event → API response.
 * Adds counts and a `viewer` block (what this user is to this event) and
 * strips internals. Pass the viewer's id for personalised flags.
 */
export const serializeEvent = (event: any, viewerId?: string) => {
  const obj = event.toObject ? event.toObject({ virtuals: true }) : { ...event };

  const going = idsOf(obj.goingUsers);
  const interested = idsOf(obj.interestedUsers);
  const waitlist = idsOf(obj.waitlistUsers);

  const host = isHost(obj, viewerId);
  const waitlistIndex = viewerId ? waitlist.indexOf(viewerId) : -1;

  obj.goingCount = going.length;
  obj.interestedCount = interested.length;
  obj.waitlistCount = waitlist.length;

  obj.viewer = {
    isCreator: isCreator(obj, viewerId),
    isHost: host,
    isGoing: !!viewerId && going.includes(viewerId),
    isInterested: !!viewerId && interested.includes(viewerId),
    isWaitlisted: waitlistIndex >= 0,
    waitlistPosition: waitlistIndex >= 0 ? waitlistIndex + 1 : null,
  };

  delete obj.__v;
  delete obj.imagePublicId;
  delete obj.reminders;
  delete obj.cancelledBy;

  if (!host) {
    delete obj.waitlistUsers;
    if (!exposeRsvpIds()) {
      obj.goingUsers = obj.viewer.isGoing ? [viewerId] : [];
      obj.interestedUsers = obj.viewer.isInterested ? [viewerId] : [];
    }
  }

  return obj;
};

import { Request, Response } from "express";

import { Event } from "../model/events.model";
import { AppError } from "../../../utils/AppError";
import { createNotification } from "../../Notifications/services/notification.service";
import {
  dashboardEventPath,
  hasFreeSpot,
  serializeEvent,
  toObjectId,
} from "../utils/events.helpers";
import { clip } from "../utils/notify";

/**
 * All RSVP changes are single atomic updates (filter + $addToSet/$pull + $inc),
 * so two people tapping "Going" for the last spot can never both get in, and
 * double-taps never create duplicates.
 */

/* ── Waitlist promotion ──────────────────────────────────────────── */
/**
 * While there are free spots and people waiting, move the head of the
 * waitlist into "going" and tell them. Safe to call any time (after someone
 * leaves, after capacity is raised, ...).
 */
export const promoteWaitlist = async (eventId: string): Promise<number> => {
  let promoted = 0;

  for (let i = 0; i < 100; i++) {
    const ev = await Event.findById(eventId).select(
      "title capacity cancelledAt endsAt goingUsers waitlistUsers",
    );
    if (!ev || ev.cancelledAt || ev.waitlistUsers.length === 0) break;
    if (ev.endsAt.getTime() < Date.now()) break;
    if (ev.capacity && ev.goingUsers.length >= ev.capacity) break;

    const next = ev.waitlistUsers[0];
    const moved = await Event.findOneAndUpdate(
      {
        _id: eventId,
        waitlistUsers: next,
        goingUsers: { $ne: next },
        ...hasFreeSpot(),
      },
      {
        $pull: { waitlistUsers: next },
        $addToSet: { goingUsers: next },
        $inc: { goingCount: 1, waitlistCount: -1 },
      },
    );

    if (moved) {
      promoted++;
      await createNotification({
        userId: String(next),
        type: "event",
        priority: "high",
        title: "A spot opened up!",
        message: `You're now going to "${clip(ev.title, 100)}".`,
        actionUrl: dashboardEventPath(eventId),
        actionLabel: "View event",
        meta: { eventId },
      });
    }
    // if `moved` is null we lost a race — loop and re-read the event
  }

  return promoted;
};

const loadOr404 = async (id: string) => {
  const event = await Event.findById(id);
  if (!event) throw new AppError("Event not found", 404);
  return event;
};

const assertCanJoin = (event: {
  cancelledAt?: Date;
  endsAt: Date;
}) => {
  if (event.cancelledAt)
    throw new AppError("This event has been cancelled", 409, "EVENT_CANCELLED");
  if (event.endsAt.getTime() < Date.now())
    throw new AppError("This event has already ended", 409, "EVENT_ENDED");
};

/* ═══════════════════════════════════════════════════════════════════
   TOGGLE INTEREST
═══════════════════════════════════════════════════════════════════ */
export const toggleInterest = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const uid = req.user!.id;
  const oid = toObjectId(uid);

  // 1) already interested → remove (no event checks: leaving is always allowed)
  const removed = await Event.findOneAndUpdate(
    { _id: id, interestedUsers: oid },
    { $pull: { interestedUsers: oid }, $inc: { interestedCount: -1 } },
    { new: true },
  );
  if (removed) return res.json(serializeEvent(removed, uid));

  // 2) otherwise add
  const event = await loadOr404(id);
  assertCanJoin(event);

  const added = await Event.findOneAndUpdate(
    { _id: id, interestedUsers: { $ne: oid } },
    { $addToSet: { interestedUsers: oid }, $inc: { interestedCount: 1 } },
    { new: true },
  );

  // null = a parallel request already added them → just return current state
  res.json(serializeEvent(added ?? (await loadOr404(id)), uid));
};

/* ═══════════════════════════════════════════════════════════════════
   TOGGLE GOING  (going → leave · waitlisted → leave waitlist ·
                  otherwise join, or join the waitlist if full)
═══════════════════════════════════════════════════════════════════ */
export const toggleGoing = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const uid = req.user!.id;
  const oid = toObjectId(uid);

  // 1) going → leave, then give the freed spot to the next person waiting
  const left = await Event.findOneAndUpdate(
    { _id: id, goingUsers: oid },
    { $pull: { goingUsers: oid }, $inc: { goingCount: -1 } },
    { new: true },
  );
  if (left) {
    const promoted = await promoteWaitlist(id);
    const fresh = promoted ? await loadOr404(id) : left;
    return res.json({ ...serializeEvent(fresh, uid), rsvp: "none" });
  }

  // 2) waitlisted → leave the waitlist
  const leftWaitlist = await Event.findOneAndUpdate(
    { _id: id, waitlistUsers: oid },
    { $pull: { waitlistUsers: oid }, $inc: { waitlistCount: -1 } },
    { new: true },
  );
  if (leftWaitlist)
    return res.json({ ...serializeEvent(leftWaitlist, uid), rsvp: "none" });

  // 3) join
  const event = await loadOr404(id);
  assertCanJoin(event);

  const joined = await Event.findOneAndUpdate(
    { _id: id, goingUsers: { $ne: oid }, ...hasFreeSpot() },
    {
      $addToSet: { goingUsers: oid },
      $pull: { waitlistUsers: oid },
      $inc: { goingCount: 1 },
    },
    { new: true },
  );
  if (joined) return res.json({ ...serializeEvent(joined, uid), rsvp: "going" });

  // no spot → waitlist (unless a parallel request already put them in going)
  const waitlisted = await Event.findOneAndUpdate(
    { _id: id, goingUsers: { $ne: oid }, waitlistUsers: { $ne: oid } },
    { $push: { waitlistUsers: oid }, $inc: { waitlistCount: 1 } },
    { new: true },
  );

  const current = waitlisted ?? (await loadOr404(id));
  const view = serializeEvent(current, uid);
  const rsvp = view.viewer.isGoing
    ? "going"
    : view.viewer.isWaitlisted
      ? "waitlisted"
      : "none";

  res.json({
    ...view,
    rsvp,
    ...(rsvp === "waitlisted"
      ? { message: `Event is full — you're #${view.viewer.waitlistPosition} on the waitlist` }
      : {}),
  });
};

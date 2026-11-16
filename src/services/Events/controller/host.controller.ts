import { Request, Response } from "express";

import { Event, MAX_COHOSTS } from "../model/events.model";
import { LeafLineUser } from "../../../MainAuth/signup/model/user.model";
import { createNotification } from "../../Notifications/services/notification.service";
import { AppError } from "../../../utils/AppError";
import {
  dashboardEventPath,
  isCreator,
  isHost,
  serializeEvent,
  toObjectId,
} from "../utils/events.helpers";
import { toCsv } from "../utils/csv";
import { clip, notifyEventAudience } from "../utils/notify";

// Emails are personal data: hosts only see them if you opt in with
// EVENT_HOSTS_SEE_EMAIL=true.
const hostsSeeEmail = () => process.env.EVENT_HOSTS_SEE_EMAIL === "true";

const loadEvent = async (id: string) => {
  const event = await Event.findById(id);
  if (!event) throw new AppError("Event not found", 404);
  return event;
};

const requireHost = async (id: string, userId: string) => {
  const event = await loadEvent(id);
  if (!isHost(event, userId)) throw new AppError("Only the event hosts can do this", 403);
  return event;
};

/* ═══════════════════════════════════════════════════════════════════
   CANCEL / REINSTATE
═══════════════════════════════════════════════════════════════════ */
export const cancelEvent = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const event = await requireHost(req.params.id as string, uid);

  if (event.cancelledAt) throw new AppError("Event is already cancelled", 409);
  if (event.endsAt.getTime() < Date.now())
    throw new AppError("This event has already ended", 400);

  const reason: string = req.body.reason ?? "";
  const updated = await Event.findOneAndUpdate(
    { _id: event._id, cancelledAt: null },
    {
      $set: {
        cancelledAt: new Date(),
        cancelledBy: toObjectId(uid),
        ...(reason ? { cancelReason: reason } : {}),
      },
    },
    { new: true },
  );
  if (!updated) throw new AppError("Event is already cancelled", 409);

  await notifyEventAudience(updated, {
    title: "Event cancelled",
    message: `"${clip(updated.title, 100)}" has been cancelled.${reason ? ` Reason: ${clip(reason, 200)}` : ""}`,
    priority: "high",
    exclude: [uid],
  });

  res.json({ message: "Event cancelled", event: serializeEvent(updated, uid) });
};

export const reinstateEvent = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const event = await requireHost(req.params.id as string, uid);

  if (!event.cancelledAt) throw new AppError("Event isn't cancelled", 409);
  if (event.endsAt.getTime() < Date.now())
    throw new AppError("This event has already ended", 400);

  const updated = await Event.findOneAndUpdate(
    { _id: event._id },
    { $unset: { cancelledAt: 1, cancelReason: 1, cancelledBy: 1 } },
    { new: true },
  );

  await notifyEventAudience(updated!, {
    title: "Event is back on",
    message: `Good news — "${clip(updated!.title, 100)}" is going ahead after all.`,
    priority: "high",
    exclude: [uid],
  });

  res.json({ message: "Event reinstated", event: serializeEvent(updated, uid) });
};

/* ═══════════════════════════════════════════════════════════════════
   HOSTS  (creator + co-hosts)
═══════════════════════════════════════════════════════════════════ */
const hostsPayload = async (event: { createdBy: any; coHosts: any[] }) => {
  const ids = [event.createdBy, ...event.coHosts];
  const users = await LeafLineUser.find({ _id: { $in: ids } }).select(
    "name picture",
  );
  const byId = new Map(users.map((u) => [u.id, u]));
  const shape = (id: any, role: "creator" | "cohost") => {
    const u = byId.get(String(id));
    return u
      ? { id: u.id, name: u.name, picture: u.picture ?? null, role }
      : null;
  };
  return [
    shape(event.createdBy, "creator"),
    ...event.coHosts.map((id) => shape(id, "cohost")),
  ].filter(Boolean);
};

export const listHosts = async (req: Request, res: Response) => {
  const event = await loadEvent(req.params.id as string);
  res.json({ hosts: await hostsPayload(event) });
};

export const addCoHost = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const event = await loadEvent(req.params.id as string);
  if (!isCreator(event, uid))
    throw new AppError("Only the event creator can add co-hosts", 403);

  const { userId, email } = req.body as { userId?: string; email?: string };
  const target = userId
    ? await LeafLineUser.findById(userId).select("name")
    : await LeafLineUser.findOne({ email }).select("name");
  if (!target) throw new AppError("No LeafLine user found for that person", 404);

  if (target.id === uid)
    throw new AppError("You're already the creator of this event", 400);
  if (isHost(event, target.id))
    throw new AppError(`${target.name} is already a co-host`, 409);
  if (event.coHosts.length >= MAX_COHOSTS)
    throw new AppError(`You can have up to ${MAX_COHOSTS} co-hosts`, 400);

  // atomic: the size check is repeated inside the update to beat races
  const updated = await Event.findOneAndUpdate(
    {
      _id: event._id,
      coHosts: { $ne: target._id },
      [`coHosts.${MAX_COHOSTS - 1}`]: { $exists: false },
    },
    { $addToSet: { coHosts: target._id } },
    { new: true },
  );
  if (!updated) throw new AppError("Couldn't add co-host. Try again.", 409);

  await createNotification({
    userId: target.id,
    type: "event",
    priority: "normal",
    title: "You're a co-host",
    message: `${req.user!.name} added you as a co-host of "${clip(updated.title, 100)}".`,
    actionUrl: dashboardEventPath(updated.id),
    actionLabel: "View event",
    meta: { eventId: updated.id },
  });

  res.status(201).json({
    message: "Co-host added",
    hosts: await hostsPayload(updated),
  });
};

export const removeCoHost = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const targetId = req.params.userId as string;
  const event = await loadEvent(req.params.id as string);

  const isSelf = targetId === uid;
  if (!isCreator(event, uid) && !isSelf)
    throw new AppError("Only the creator can remove co-hosts", 403);
  if (!event.coHosts.map(String).includes(targetId))
    throw new AppError("That person isn't a co-host", 404);

  const updated = await Event.findOneAndUpdate(
    { _id: event._id },
    { $pull: { coHosts: toObjectId(targetId) } },
    { new: true },
  );

  res.json({ message: "Co-host removed", hosts: await hostsPayload(updated!) });
};

/* ═══════════════════════════════════════════════════════════════════
   ATTENDEES  (hosts only)
═══════════════════════════════════════════════════════════════════ */
const ATTENDEE_FIELDS = () => (hostsSeeEmail() ? "name picture email" : "name picture");

const shapeAttendee = (u: any) => ({
  id: u.id,
  name: u.name,
  picture: u.picture ?? null,
  ...(hostsSeeEmail() ? { email: u.email } : {}),
});

export const getAttendees = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const event = await requireHost(req.params.id as string, uid);

  const { status, page, limit } = res.locals.query as {
    status: "going" | "interested" | "waitlist";
    page: number;
    limit: number;
  };

  const all =
    status === "going"
      ? event.goingUsers
      : status === "interested"
        ? event.interestedUsers
        : event.waitlistUsers;

  const slice = all.slice((page - 1) * limit, page * limit);
  const users = await LeafLineUser.find({ _id: { $in: slice } }).select(
    ATTENDEE_FIELDS(),
  );
  const byId = new Map(users.map((u) => [u.id, u]));

  res.json({
    status,
    total: all.length,
    page,
    pages: Math.ceil(all.length / limit),
    // keep RSVP order (matters for the waitlist)
    attendees: slice
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map(shapeAttendee),
  });
};

export const exportAttendeesCsv = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const event = await requireHost(req.params.id as string, uid);

  const groups: [string, any[]][] = [
    ["Going", event.goingUsers],
    ["Waitlist", event.waitlistUsers],
    ["Interested", event.interestedUsers],
  ];
  const everyone = [...new Set(groups.flatMap(([, ids]) => ids.map(String)))];
  const users = await LeafLineUser.find({ _id: { $in: everyone } }).select(
    ATTENDEE_FIELDS(),
  );
  const byId = new Map(users.map((u) => [u.id, u]));

  const header = hostsSeeEmail() ? ["Name", "Email", "Status"] : ["Name", "Status"];
  const rows: unknown[][] = [header];
  for (const [label, ids] of groups) {
    for (const id of ids) {
      const u = byId.get(String(id));
      if (!u) continue;
      rows.push(hostsSeeEmail() ? [u.name, u.email, label] : [u.name, label]);
    }
  }

  const filename =
    event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "event";

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}-attendees.csv"`);
  res.send("\uFEFF" + toCsv(rows)); // BOM so Excel reads UTF-8 names correctly
};

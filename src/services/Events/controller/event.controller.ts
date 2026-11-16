import { Request, Response } from "express";

import { Event, IEvent, deriveSchedule } from "../model/events.model";
import { Comment } from "../model/comment.model";
import { EventUpdate } from "../model/eventUpdate.model";
import { Follow } from "../model/follow.model";
import { createManyNotifications } from "../../Notifications/services/notification.service";
import { deleteImage, uploadImage } from "../Cloudinary/Cloudinary.helper";
import { AppError } from "../../../utils/AppError";
import {
  dashboardEventPath,
  isHost,
  publicEventUrl,
  serializeEvent,
} from "../utils/events.helpers";
import { buildEventIcs, calendarLinks } from "../utils/ics";
import { clip, eventAudience, notifyEventAudience } from "../utils/notify";
import { promoteWaitlist } from "./rsvp.controller";

/** Small grace so "starts now" events can still be created. */
const START_GRACE_MS = 5 * 60 * 1000;

const sameTime = (a?: Date | null, b?: Date | null) =>
  (a?.getTime() ?? null) === (b?.getTime() ?? null);

/** physical/hybrid need a place; online/hybrid need a link. */
const assertLocationRules = (
  mode: string,
  location?: string | null,
  onlineLink?: string | null,
) => {
  if ((mode === "physical" || mode === "hybrid") && !location)
    throw new AppError("Location is required for in-person events", 400);
  if ((mode === "online" || mode === "hybrid") && !onlineLink)
    throw new AppError("A meeting link is required for online events", 400);
};

const isCleared = (v: unknown) => v === "" || v === null;

/* ═══════════════════════════════════════════════════════════════════
   CREATE EVENT
═══════════════════════════════════════════════════════════════════ */
export const createEvent = async (req: Request, res: Response) => {
  const user = req.user!;
  const b = req.body;

  const startTime = new Date(b.startTime);
  const endTime = b.endTime ? new Date(b.endTime) : undefined;
  const { date, endsAt } = deriveSchedule(startTime, endTime);

  let image: string | undefined;
  let imagePublicId: string | undefined;
  if (req.file) {
    const result = await uploadImage(req.file.buffer);
    image = result.url;
    imagePublicId = result.publicId;
  }

  const event = await Event.create({
    title: b.title,
    description: b.description,
    category: b.category,
    mode: b.mode,
    startTime,
    endTime,
    date,
    endsAt,
    location: b.location,
    onlineLink: b.onlineLink,
    capacity: b.capacity,
    createdBy: user.id,
    creatorName: user.name,
    image,
    imagePublicId,
  });

  // Tell the organizer's followers (fire-and-forget; never blocks the response)
  void notifyFollowersOfNewEvent(event);

  res
    .status(201)
    .json({ message: "Event created", event: serializeEvent(event, user.id) });
};

const notifyFollowersOfNewEvent = async (event: IEvent) => {
  try {
    const followers = await Follow.find({ followeeId: event.createdBy })
      .select("followerId")
      .lean();
    if (followers.length === 0) return;

    await createManyNotifications({
      userIds: followers.map((f) => String(f.followerId)),
      type: "event",
      priority: "normal",
      title: `New event from ${event.creatorName}`,
      message: `${event.creatorName} posted "${clip(event.title, 100)}"`,
      actionUrl: dashboardEventPath(event.id),
      actionLabel: "View event",
      meta: { eventId: event.id, organizerId: String(event.createdBy) },
    });
  } catch (err) {
    console.error("❌ Follower notification failed:", err);
  }
};

/* ═══════════════════════════════════════════════════════════════════
   GET ALL EVENTS  (public · paginated · search · filter · sort)
═══════════════════════════════════════════════════════════════════ */
export const getAllEvents = async (req: Request, res: Response) => {
  const q = res.locals.query as {
    search?: string;
    category?: string[];
    mode?: string[];
    status?: "upcoming" | "live" | "ended" | "active" | "cancelled";
    creator?: string;
    from?: Date;
    to?: Date;
    includeCancelled: boolean;
    sort: "date" | "latest" | "popular" | "relevance";
    page: number;
    limit: number;
  };

  const now = new Date();
  const and: any[] = [];

  if (q.search) and.push({ $text: { $search: q.search } });
  if (q.category?.length) and.push({ category: { $in: q.category } });
  if (q.mode?.length) and.push({ mode: { $in: q.mode } });
  if (q.creator) and.push({ createdBy: q.creator });
  if (q.from) and.push({ startTime: { $gte: q.from } });
  if (q.to) and.push({ startTime: { $lte: q.to } });

  // Status is computed from startTime/endsAt/cancelledAt — the same rules as
  // the `status` virtual, so filters and badges can never disagree.
  switch (q.status) {
    case "upcoming":
      and.push({ startTime: { $gt: now }, cancelledAt: null });
      break;
    case "live":
      and.push({ startTime: { $lte: now }, endsAt: { $gte: now }, cancelledAt: null });
      break;
    case "ended":
      and.push({ endsAt: { $lt: now }, cancelledAt: null });
      break;
    case "active":
      and.push({ endsAt: { $gte: now }, cancelledAt: null });
      break;
    case "cancelled":
      and.push({ cancelledAt: { $ne: null } });
      break;
    default:
      if (!q.includeCancelled) and.push({ cancelledAt: null });
  }

  const filter = and.length ? { $and: and } : {};
  const skip = (q.page - 1) * q.limit;

  const useRelevance = q.sort === "relevance" && !!q.search;
  const sort: Record<string, any> = useRelevance
    ? { score: { $meta: "textScore" } }
    : q.sort === "latest"
      ? { createdAt: -1 }
      : q.sort === "popular"
        ? { goingCount: -1, startTime: 1 }
        : { startTime: q.status === "ended" ? -1 : 1 }; // recent-first for ended

  const query = Event.find(
    filter,
    useRelevance ? { score: { $meta: "textScore" } } : undefined,
  )
    .sort(sort)
    .skip(skip)
    .limit(q.limit);

  const [events, total] = await Promise.all([
    query,
    Event.countDocuments(filter),
  ]);

  res.json({
    total,
    page: q.page,
    pages: Math.ceil(total / q.limit),
    events: events.map((e) => serializeEvent(e, req.user?.id)),
  });
};

/* ═══════════════════════════════════════════════════════════════════
   GET SINGLE EVENT
═══════════════════════════════════════════════════════════════════ */
export const getEvent = async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);
  res.json(serializeEvent(event, req.user?.id));
};

/* ═══════════════════════════════════════════════════════════════════
   MY EVENTS  (I created or co-host)  ·  GOING EVENTS
═══════════════════════════════════════════════════════════════════ */
export const getMyEvents = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const events = await Event.find({
    $or: [{ createdBy: uid }, { coHosts: uid }],
  }).sort({ startTime: 1 });
  res.json(events.map((e) => serializeEvent(e, uid)));
};

export const getGoingEvents = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const events = await Event.find({ goingUsers: uid }).sort({ startTime: 1 });
  res.json(events.map((e) => serializeEvent(e, uid)));
};

/* ═══════════════════════════════════════════════════════════════════
   UPDATE EVENT  (creator or co-host)
═══════════════════════════════════════════════════════════════════ */
export const updateEvent = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);
  if (!isHost(event, uid)) throw new AppError("Not allowed", 403);
  if (event.cancelledAt)
    throw new AppError(
      "This event is cancelled. Reinstate it before editing.",
      409,
    );

  const b = req.body as Record<string, any>;
  const hasChanges =
    Object.keys(b).length > 0 || !!req.file;
  if (!hasChanges) throw new AppError("Nothing to update", 400);

  const $set: Record<string, any> = {};
  const $unset: Record<string, 1> = {};
  const now = new Date();

  for (const k of ["title", "description", "category", "mode"] as const) {
    if (b[k] !== undefined) $set[k] = b[k];
  }

  // ── schedule ──
  const newStart = b.startTime ? new Date(b.startTime) : event.startTime;
  const startChanged = !!b.startTime && !sameTime(newStart, event.startTime);
  if (startChanged && newStart.getTime() < now.getTime() - START_GRACE_MS)
    throw new AppError("Start time must be in the future", 400);

  let newEnd: Date | undefined = event.endTime;
  let endChanged = false;
  if (b.endTime !== undefined) {
    endChanged = true;
    newEnd = isCleared(b.endTime) ? undefined : new Date(b.endTime);
  }
  if (newEnd && newEnd.getTime() <= newStart.getTime())
    throw new AppError("End time must be after the start time", 400);

  if (startChanged) $set.startTime = newStart;
  if (endChanged) {
    if (newEnd) $set.endTime = newEnd;
    else $unset.endTime = 1;
  }
  if (startChanged || endChanged) {
    const { date, endsAt } = deriveSchedule(newStart, newEnd);
    $set.date = date;
    $set.endsAt = endsAt;
  }
  // moved to a new time → reminders must fire again
  if (startChanged) {
    $set["reminders.h24"] = false;
    $set["reminders.h1"] = false;
  }

  // ── location / link / mode ──
  const finalMode = (b.mode ?? event.mode) as string;
  let finalLocation = event.location as string | undefined;
  let finalLink = event.onlineLink as string | undefined;

  if (b.location !== undefined) {
    if (isCleared(b.location)) {
      finalLocation = undefined;
      $unset.location = 1;
    } else {
      finalLocation = b.location;
      $set.location = b.location;
    }
  }
  if (b.onlineLink !== undefined) {
    if (isCleared(b.onlineLink)) {
      finalLink = undefined;
      $unset.onlineLink = 1;
    } else {
      finalLink = b.onlineLink;
      $set.onlineLink = b.onlineLink;
    }
  }
  assertLocationRules(finalMode, finalLocation, finalLink);

  // ── capacity ──
  let capacityRaised = false;
  if (b.capacity !== undefined) {
    if (isCleared(b.capacity)) {
      $unset.capacity = 1;
      capacityRaised = event.waitlistUsers.length > 0;
    } else {
      const cap = Number(b.capacity);
      if (cap < event.goingUsers.length)
        throw new AppError(
          `Capacity can't be lower than the ${event.goingUsers.length} people already going`,
          400,
        );
      $set.capacity = cap;
      capacityRaised = !event.capacity || cap > event.capacity;
    }
  }

  // ── image (upload first, delete the old one only after the DB write) ──
  let oldImageToDelete: string | undefined;
  if (req.file) {
    const result = await uploadImage(req.file.buffer);
    $set.image = result.url;
    $set.imagePublicId = result.publicId;
    oldImageToDelete = event.imagePublicId;
  } else if (b.removeImage === true) {
    $unset.image = 1;
    $unset.imagePublicId = 1;
    oldImageToDelete = event.imagePublicId;
  }

  const update: Record<string, any> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;

  const updated = await Event.findOneAndUpdate({ _id: event._id }, update, {
    new: true,
    runValidators: true,
  });
  if (!updated) throw new AppError("Event not found", 404);

  if (oldImageToDelete) await deleteImage(oldImageToDelete);

  // ── tell attendees about anything that affects them ──
  const changes: string[] = [];
  if (startChanged || endChanged) changes.push("time");
  if (b.location !== undefined && (b.location || "") !== (event.location || ""))
    changes.push("location");
  if (
    b.onlineLink !== undefined &&
    (b.onlineLink || "") !== (event.onlineLink || "")
  )
    changes.push("meeting link");
  if (b.mode !== undefined && b.mode !== event.mode) changes.push("format");

  if (changes.length > 0) {
    await notifyEventAudience(updated, {
      title: "Event updated",
      message: `"${clip(updated.title, 100)}" has a new ${changes.join(", ")}. Tap to see the details.`,
      priority: "high",
      exclude: [uid],
    });
  }

  if (capacityRaised) await promoteWaitlist(updated.id);

  const fresh = capacityRaised ? await Event.findById(updated.id) : updated;
  res.json({
    message: "Event updated",
    event: serializeEvent(fresh ?? updated, uid),
  });
};

/* ═══════════════════════════════════════════════════════════════════
   DELETE EVENT  (creator, or admin)
═══════════════════════════════════════════════════════════════════ */
export const deleteEvent = async (req: Request, res: Response) => {
  const user = req.user!;
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);

  const isAdmin = user.role === "admin" || user.role === "superadmin";
  if (String(event.createdBy) !== user.id && !isAdmin)
    throw new AppError("Not allowed", 403);

  // People expecting an upcoming event deserve to know it's gone.
  const stillMatters = !event.cancelledAt && event.endsAt.getTime() > Date.now();
  const audience = stillMatters ? eventAudience(event, [user.id]) : [];

  await Promise.all([
    Event.findByIdAndDelete(event._id),
    Comment.deleteMany({ eventId: event._id }),
    EventUpdate.deleteMany({ eventId: event._id }),
  ]);
  if (event.imagePublicId) await deleteImage(event.imagePublicId);

  if (audience.length > 0) {
    await createManyNotifications({
      userIds: audience,
      type: "event",
      priority: "high",
      title: "Event removed",
      message: `"${clip(event.title, 100)}" has been removed by the organizer.`,
      actionUrl: "/dashboard/events",
      actionLabel: "Browse events",
      meta: { eventId: event.id },
    });
  }

  res.json({ message: "Event deleted" });
};

/* ═══════════════════════════════════════════════════════════════════
   SHARE LINK  (+ add-to-calendar links)
═══════════════════════════════════════════════════════════════════ */
export const getShareLink = async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);

  const link = publicEventUrl(req.params.id as string);
  const enc = encodeURIComponent(link);
  const text = encodeURIComponent(`Check out "${event.title}" on LeafLine!`);

  res.json({
    shareLink: link,
    shareUrls: {
      whatsapp: `https://wa.me/?text=${text}%20${enc}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${enc}`,
      telegram: `https://t.me/share/url?url=${enc}&text=${text}`,
      copy: link,
    },
    calendar: calendarLinks(event, link),
    og: {
      title: event.title,
      description: event.description,
      image: event.image ?? `${new URL(link).origin}/og-default.png`,
      url: link,
    },
  });
};

/* ═══════════════════════════════════════════════════════════════════
   ADD TO CALENDAR  (.ics download)
═══════════════════════════════════════════════════════════════════ */
export const downloadCalendarFile = async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);

  const ics = buildEventIcs(event, {
    url: publicEventUrl(event.id),
  });

  const filename =
    event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event";

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.ics"`);
  res.send(ics);
};

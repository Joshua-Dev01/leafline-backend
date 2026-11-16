import { Request, Response } from "express";

import { Event } from "../model/events.model";
import { EventUpdate } from "../model/eventUpdate.model";
import { AppError } from "../../../utils/AppError";
import { isHost } from "../utils/events.helpers";
import { clip, notifyEventAudience } from "../utils/notify";

const MAX_PINNED = 3;

const requireHost = async (eventId: string, userId: string) => {
  const event = await Event.findById(eventId);
  if (!event) throw new AppError("Event not found", 404);
  if (!isHost(event, userId))
    throw new AppError("Only the event hosts can post updates", 403);
  return event;
};

const assertPinRoom = async (eventId: string, exceptId?: string) => {
  const pinned = await EventUpdate.countDocuments({
    eventId,
    pinned: true,
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  });
  if (pinned >= MAX_PINNED)
    throw new AppError(`You can pin up to ${MAX_PINNED} updates`, 400);
};

/* ═══════════════════════════════════════════════════════════════════
   POST AN UPDATE  (hosts)
═══════════════════════════════════════════════════════════════════ */
export const createUpdate = async (req: Request, res: Response) => {
  const user = req.user!;
  const event = await requireHost(req.params.id as string, user.id);
  const { text, pinned, notify } = req.body as {
    text: string;
    pinned: boolean;
    notify: boolean;
  };

  if (pinned) await assertPinRoom(event.id);

  const update = await EventUpdate.create({
    eventId: event._id,
    authorId: user.id,
    authorName: user.name,
    text,
    pinned,
  });

  if (notify) {
    await notifyEventAudience(event, {
      title: `Update: ${clip(event.title, 80)}`,
      message: clip(text, 200),
      priority: "normal",
      exclude: [user.id],
    });
  }

  res.status(201).json({ message: "Update posted", update });
};

/* ═══════════════════════════════════════════════════════════════════
   LIST UPDATES  (public · pinned first, then newest)
═══════════════════════════════════════════════════════════════════ */
export const getUpdates = async (req: Request, res: Response) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };

  const exists = await Event.exists({ _id: req.params.id });
  if (!exists) throw new AppError("Event not found", 404);

  const filter = { eventId: req.params.id };
  const [updates, total] = await Promise.all([
    EventUpdate.find(filter)
      .sort({ pinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    EventUpdate.countDocuments(filter),
  ]);

  res.json({ total, page, pages: Math.ceil(total / limit), updates });
};

/* ═══════════════════════════════════════════════════════════════════
   EDIT / PIN  ·  DELETE  (hosts)
═══════════════════════════════════════════════════════════════════ */
export const editUpdate = async (req: Request, res: Response) => {
  await requireHost(req.params.id as string, req.user!.id);
  const { text, pinned } = req.body as { text?: string; pinned?: boolean };

  const current = await EventUpdate.findOne({
    _id: req.params.updateId,
    eventId: req.params.id,
  });
  if (!current) throw new AppError("Update not found", 404);

  if (pinned && !current.pinned) await assertPinRoom(req.params.id as string);

  if (text !== undefined) current.text = text;
  if (pinned !== undefined) current.pinned = pinned;
  await current.save();

  res.json({ message: "Update saved", update: current });
};

export const deleteUpdate = async (req: Request, res: Response) => {
  await requireHost(req.params.id as string, req.user!.id);

  const deleted = await EventUpdate.findOneAndDelete({
    _id: req.params.updateId,
    eventId: req.params.id,
  });
  if (!deleted) throw new AppError("Update not found", 404);

  res.json({ message: "Update deleted" });
};

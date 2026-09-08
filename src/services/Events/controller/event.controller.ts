import { Request, Response } from "express";
import mongoose from "mongoose";

import { LeafLineUser } from "../../../MainAuth/signup/model/user.model";
import { Event } from "../model/events.model";
import { Comment } from "../model/comment.model";
import { Notification } from "../../Notifications/models/notification.model";
import { deleteImage, uploadImage } from "../Cloudinary/Cloudinary.helper";

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */

/** Serialize event with all virtuals for API response */
const serialize = (event: any) => {
  const obj = event.toObject ? event.toObject({ virtuals: true }) : event;
  return obj;
};

/** Convert string id to ObjectId safely */
const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

/* ═══════════════════════════════════════════════════════════════════
   CREATE EVENT
═══════════════════════════════════════════════════════════════════ */
export const createEvent = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const user = await LeafLineUser.findById(req.user.id).select("name");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Derive date from startTime for indexing / status calculation
    const startTime = new Date(req.body.startTime);
    const date = new Date(
      startTime.getFullYear(),
      startTime.getMonth(),
      startTime.getDate(),
    );

    let image: string | undefined;
    let imagePublicId: string | undefined;

    if (req.file) {
      const result = await uploadImage(req.file.buffer);
      image = result.url;
      imagePublicId = result.publicId;
    }

    const event = await Event.create({
      ...req.body,
      date,
      createdBy: user._id,
      creatorName: user.name,
      image,
      imagePublicId,
    });

    res.status(201).json({ message: "Event created", event: serialize(event) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   GET ALL EVENTS  (paginated + search + filter + sort)
═══════════════════════════════════════════════════════════════════ */
export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      mode,
      status,
      page = 1,
      limit = 12,
      sort = "date",
    } = req.query;

    const query: any = {};

    // Full-text search on title + description
    if (search) query.$text = { $search: search as string };

    if (category) query.category = category;
    if (mode) query.mode = mode;

    // Status filter maps to date ranges
    if (status) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (status === "upcoming") query.startTime = { $gt: now };
      if (status === "live") query.startTime = { $lte: now };
      if (status === "ended") query.endTime = { $lt: now };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const sortMap: Record<string, any> = {
      date: { startTime: 1 },
      latest: { createdAt: -1 },
      popular: { goingUsers: -1 },
    };
    const sortFilter = sortMap[sort as string] ?? sortMap.date;

    const [events, total] = await Promise.all([
      Event.find(query).sort(sortFilter).skip(skip).limit(Number(limit)),
      Event.countDocuments(query),
    ]);

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      events: events.map(serialize),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   GET SINGLE EVENT
═══════════════════════════════════════════════════════════════════ */
export const getEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(serialize(event));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   GET MY EVENTS  (events I created)
═══════════════════════════════════════════════════════════════════ */
export const getMyEvents = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const events = await Event.find({ createdBy: req.user.id }).sort({
      startTime: 1,
    });
    res.json(events.map(serialize));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   GET EVENTS I'M GOING TO
═══════════════════════════════════════════════════════════════════ */
export const getGoingEvents = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const events = await Event.find({ goingUsers: req.user.id }).sort({
      startTime: 1,
    });
    res.json(events.map(serialize));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   UPDATE EVENT  (creator only)
═══════════════════════════════════════════════════════════════════ */
export const updateEvent = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.createdBy.toString() !== req.user.id)
      return res.status(403).json({ message: "Not allowed" });

    const updates: Record<string, any> = { ...req.body };

    // Recompute date if startTime changes
    if (req.body.startTime) {
      const st = new Date(req.body.startTime);
      updates.date = new Date(st.getFullYear(), st.getMonth(), st.getDate());
    }

    // Handle new image
    if (req.file) {
      if (event.imagePublicId) await deleteImage(event.imagePublicId);
      const result = await uploadImage(req.file.buffer);
      updates.image = result.url;
      updates.imagePublicId = result.publicId;
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    res.json({ message: "Event updated", event: serialize(updated) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   DELETE EVENT  (creator only)
═══════════════════════════════════════════════════════════════════ */
export const deleteEvent = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.createdBy.toString() !== req.user.id)
      return res.status(403).json({ message: "Not allowed" });

    // Clean up Cloudinary image
    if (event.imagePublicId) await deleteImage(event.imagePublicId);

    // Delete event + all its comments
    await Promise.all([
      Event.findByIdAndDelete(req.params.id),
      Comment.deleteMany({ eventId: req.params.id }),
    ]);

    res.json({ message: "Event deleted" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   TOGGLE INTEREST
═══════════════════════════════════════════════════════════════════ */
export const toggleInterest = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const uid = req.user.id;
    const idx = event.interestedUsers.findIndex(
      (id: any) => id.toString() === uid,
    );

    if (idx >= 0) event.interestedUsers.splice(idx, 1);
    else event.interestedUsers.push(toObjectId(uid));

    await event.save();
    res.json(serialize(event));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   TOGGLE GOING
═══════════════════════════════════════════════════════════════════ */
export const toggleGoing = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Check capacity before adding
    if (event.capacity && event.goingUsers.length >= event.capacity) {
      const uid = req.user.id;
      const idx = event.goingUsers.findIndex(
        (id: any) => id.toString() === uid,
      );
      // Allow removal even if full
      if (idx < 0) return res.status(400).json({ message: "Event is full" });
    }

    const uid = req.user.id;
    const idx = event.goingUsers.findIndex((id: any) => id.toString() === uid);

    if (idx >= 0) event.goingUsers.splice(idx, 1);
    else event.goingUsers.push(toObjectId(uid));

    await event.save();
    res.json(serialize(event));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   SHARE LINK
═══════════════════════════════════════════════════════════════════ */
export const getShareLink = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id).select(
      "title description image startTime location onlineLink creatorName category",
    );
    if (!event) return res.status(404).json({ message: "Event not found" });

    const BASE = process.env.FRONTEND_URL ?? "https://leafline.app";
    const link = `${BASE}/events/${req.params.id}`;
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
      og: {
        title: event.title,
        description: event.description,
        image: event.image ?? `${BASE}/og-default.png`,
        url: link,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

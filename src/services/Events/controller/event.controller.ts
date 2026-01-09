// src/services/Events/controller/events.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import streamifier from "streamifier";
import { LeafLineUser } from "../../../MainAuth/signup/model/user.model";
import { Event } from "../model/events.model";
import { Notification } from "../../Notifications/models/notification.model";
import cloudinary from "../../../config/cloudinary";
import cron from "node-cron";

// Helper function to determine event status
const getEventStatus = (eventDate: Date): "upcoming" | "ongoing" | "ended" => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (eventDay > today) return "upcoming";
    if (eventDay.getTime() === today.getTime()) return "ongoing";
    return "ended";
};

// Helper to add status to event object
const addStatusToEvent = (event: any) => {
    const eventObj = event.toObject ? event.toObject() : event;
    return {
        ...eventObj,
        status: getEventStatus(eventObj.date)
    };
};

// ✅ Create Event with optional image
export const createEvent = async (req: any, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const user = await LeafLineUser.findById(req.user.id).select("name");

        let imageUrl: string | undefined;

        if (req.file) {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "leafline/events", resource_type: "auto" },
                async (error, result) => {
                    if (error) return res.status(500).json({ message: "Image upload failed", error });

                    imageUrl = result?.secure_url;

                    const event = await Event.create({
                        ...req.body,
                        createdBy: user?._id,
                        creatorName: user?.name,
                        image: imageUrl,
                    });

                    const eventWithStatus = addStatusToEvent(event);
                    return res.status(201).json({ message: "Event created successfully", event: eventWithStatus });
                }
            );

            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
            return;
        }

        // ✅ No image
        const event = await Event.create({
            ...req.body,
            createdBy: user?._id,
            creatorName: user?.name,
        });

        const eventWithStatus = addStatusToEvent(event);
        res.status(201).json({ message: "Event created successfully", event: eventWithStatus });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Get all events with pagination + search + sorting + status filter
export const getAllEvents = async (req: Request, res: Response) => {
    try {
        const { search, topic, page = 1, limit = 10, sort, status } = req.query;

        const query: any = {};
        if (search) query.title = { $regex: search as string, $options: "i" };
        if (topic) query.topic = topic;

        // Add date filters based on status
        if (status) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (status === "upcoming") {
                query.date = { $gte: tomorrow };
            } else if (status === "ongoing") {
                query.date = { $gte: today, $lt: tomorrow };
            } else if (status === "ended") {
                query.date = { $lt: today };
            }
        }

        const skip = (Number(page) - 1) * Number(limit);

        const sortFilter: any =
            sort === "latest" ? { createdAt: -1 } :
                sort === "date" ? { date: 1 } :
                    { date: 1 };

        const [events, total] = await Promise.all([
            Event.find(query).sort(sortFilter).skip(skip).limit(Number(limit)),
            Event.countDocuments(query),
        ]);

        // Add status to each event
        const eventsWithStatus = events.map(addStatusToEvent);

        res.json({
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            events: eventsWithStatus
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Get current user events
export const getMyEvents = async (req: any, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const events = await Event.find({ createdBy: req.user.id });
    const eventsWithStatus = events.map(addStatusToEvent);
    res.json(eventsWithStatus);
};

// ✅ Toggle interest
export const toggleInterest = async (req: any, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const index = event.interestedUsers.indexOf(userId);

    if (index >= 0) event.interestedUsers.splice(index, 1);
    else event.interestedUsers.push(userId);

    await event.save();
    const eventWithStatus = addStatusToEvent(event);
    res.json(eventWithStatus);
};

// ✅ Toggle going
export const toggleGoing = async (req: any, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const index = event.goingUsers.indexOf(userId);

    if (index >= 0) event.goingUsers.splice(index, 1);
    else event.goingUsers.push(userId);

    await event.save();
    const eventWithStatus = addStatusToEvent(event);
    res.json(eventWithStatus);
};

// ✅ Delete event
export const deleteEvent = async (req: any, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.createdBy.toString() !== req.user.id)
        return res.status(403).json({ message: "Not allowed" });

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Event deleted" });
};

// ✅ 24h Reminder Cron
export const scheduleEventReminders = () => {
    cron.schedule("0 * * * *", async () => {
        try {
            const now = new Date();
            const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            const events = await Event.find({
                date: { $gte: now, $lte: next24Hours },
                reminderSent: false,
            });

            for (const event of events) {
                const receivers = [...event.interestedUsers, ...event.goingUsers].filter(
                    (id, i, arr) => arr.indexOf(id) === i
                );

                if (receivers.length > 0) {
                    await Notification.insertMany(
                        receivers.map((userId) => ({
                            userId,
                            title: "Event Reminder",
                            message: `Reminder: '${event.title}' is happening in less than 24 hours!`,
                            type: "event",
                        }))
                    );
                }

                event.reminderSent = true;
                await event.save();
            }

            console.log("✅ Event reminders sent");
        } catch (err) {
            console.error("Reminder Cron Error:", err);
        }
    });
};
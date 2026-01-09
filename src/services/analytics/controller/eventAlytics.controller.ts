// src/services/Events/controller/analytics.controller.ts
import { Response } from "express";
import mongoose from "mongoose";
import { Event } from "../../Events/model/events.model";

export const getEventEngagementAnalytics = async (req: any, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;

        /* -------------------- DATE BOUNDARIES -------------------- */
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        /* -------------------- MATCH FILTER -------------------- */
        const matchFilter: any = {
            createdBy: new mongoose.Types.ObjectId(userId),
        };

        /* -------------------- AGGREGATION -------------------- */
        const analytics = await Event.aggregate([
            { $match: matchFilter },

            /* -------- PROJECT -------- */
            {
                $project: {
                    title: 1,
                    date: 1,

                    interestedCount: { $size: "$interestedUsers" },
                    goingCount: { $size: "$goingUsers" },

                    totalEngagement: {
                        $size: { $setUnion: ["$interestedUsers", "$goingUsers"] },
                    },

                    /* -------- STATUS FLAGS -------- */
                    isUpcoming: { $gte: ["$date", tomorrow] },
                    isOngoing: { $and: [{ $gte: ["$date", today] }, { $lt: ["$date", tomorrow] }] },
                    isEnded: { $lt: ["$date", today] },
                },
            },

            /* -------- GROUP SUMMARY -------- */
            {
                $group: {
                    _id: null,

                    totalEvents: { $sum: 1 },
                    totalInterested: { $sum: "$interestedCount" },
                    totalGoing: { $sum: "$goingCount" },
                    totalUniqueEngagements: { $sum: "$totalEngagement" },

                    upcomingEvents: { $sum: { $cond: ["$isUpcoming", 1, 0] } },
                    ongoingEvents: { $sum: { $cond: ["$isOngoing", 1, 0] } },
                    endedEvents: { $sum: { $cond: ["$isEnded", 1, 0] } },

                    events: {
                        $push: {
                            title: "$title",
                            date: "$date",
                            interestedCount: "$interestedCount",
                            goingCount: "$goingCount",
                            totalEngagement: "$totalEngagement",
                        },
                    },
                },
            },
        ]);

        /* -------------------- SAFE DEFAULT -------------------- */
        const result = analytics[0] || {
            totalEvents: 0,
            totalInterested: 0,
            totalGoing: 0,
            totalUniqueEngagements: 0,
            upcomingEvents: 0,
            ongoingEvents: 0,
            endedEvents: 0,
            events: [],
        };

        /* -------------------- TOP PERFORMING EVENTS (ENGAGEMENT) -------------------- */
        const topPerformingEvents = result.events
            .sort((a, b) => b.totalEngagement - a.totalEngagement)
            .slice(0, 5); // top 5 events by engagement

        /* -------------------- RESPONSE -------------------- */
        res.json({
            summary: {
                totalEvents: result.totalEvents,
                totalInterested: result.totalInterested,
                totalGoing: result.totalGoing,
                upcomingEvents: result.upcomingEvents,
                ongoingEvents: result.ongoingEvents,
                endedEvents: result.endedEvents,
            },
            allEvents: result.events,
            topPerformingEvents, // <-- added back
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

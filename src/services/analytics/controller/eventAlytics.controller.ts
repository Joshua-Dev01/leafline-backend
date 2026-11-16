// src/services/analytics/controller/eventAlytics.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  Event,
  DEFAULT_EVENT_DURATION_MS,
} from "../../Events/model/events.model";

/**
 * Engagement analytics for the events the user created or co-hosts.
 * Status uses the same rules as the Event `status` virtual
 * (cancelled > ended > live > upcoming), so numbers match the badges.
 */
export const getEventEngagementAnalytics = async (
  req: Request,
  res: Response,
) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    const size = (f: string) => ({ $size: { $ifNull: [f, []] } });

    const rows = await Event.aggregate([
      { $match: { $or: [{ createdBy: userId }, { coHosts: userId }] } },

      // effective end + cancelled flag (older docs may lack endsAt)
      {
        $addFields: {
          effEnd: {
            $ifNull: [
              "$endsAt",
              {
                $ifNull: [
                  "$endTime",
                  { $add: ["$startTime", DEFAULT_EVENT_DURATION_MS] },
                ],
              },
            ],
          },
          isCancelled: { $ne: [{ $ifNull: ["$cancelledAt", null] }, null] },
        },
      },
      {
        $addFields: {
          status: {
            $switch: {
              branches: [
                { case: "$isCancelled", then: "cancelled" },
                { case: { $lt: ["$effEnd", now] }, then: "ended" },
                { case: { $lte: ["$startTime", now] }, then: "live" },
              ],
              default: "upcoming",
            },
          },
        },
      },
      {
        $project: {
          title: 1,
          date: 1,
          startTime: 1,
          status: 1,
          interestedCount: size("$interestedUsers"),
          goingCount: size("$goingUsers"),
          waitlistCount: size("$waitlistUsers"),
          totalEngagement: {
            $size: {
              $setUnion: [
                { $ifNull: ["$interestedUsers", []] },
                { $ifNull: ["$goingUsers", []] },
              ],
            },
          },
        },
      },
      { $sort: { startTime: 1 } },
    ]);

    const events = rows.map((r) => ({
      id: String(r._id),
      title: r.title,
      date: r.date,
      startTime: r.startTime,
      status: r.status as string,
      interestedCount: r.interestedCount as number,
      goingCount: r.goingCount as number,
      waitlistCount: r.waitlistCount as number,
      totalEngagement: r.totalEngagement as number,
    }));

    const sum = (f: (e: (typeof events)[number]) => number) =>
      events.reduce((n, e) => n + f(e), 0);
    const count = (s: string) => events.filter((e) => e.status === s).length;

    const topPerformingEvents = [...events]
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 5);

    res.json({
      summary: {
        totalEvents: events.length,
        totalInterested: sum((e) => e.interestedCount),
        totalGoing: sum((e) => e.goingCount),
        totalWaitlisted: sum((e) => e.waitlistCount),
        totalUniqueEngagements: sum((e) => e.totalEngagement),
        upcomingEvents: count("upcoming"),
        ongoingEvents: count("live"),
        endedEvents: count("ended"),
        cancelledEvents: count("cancelled"),
      },
      allEvents: events,
      topPerformingEvents,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

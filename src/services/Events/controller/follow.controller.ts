import { Request, Response } from "express";

import { Event } from "../model/events.model";
import { Follow } from "../model/follow.model";
import { LeafLineUser } from "../../../MainAuth/signup/model/user.model";
import { AppError } from "../../../utils/AppError";
import { serializeEvent, toObjectId } from "../utils/events.helpers";

const loadOrganizer = async (id: string) => {
  const user = await LeafLineUser.findById(id).select("name picture bio");
  if (!user) throw new AppError("Organizer not found", 404);
  return user;
};

/* ═══════════════════════════════════════════════════════════════════
   FOLLOW / UNFOLLOW
═══════════════════════════════════════════════════════════════════ */
export const followOrganizer = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const organizerId = req.params.userId as string;
  if (organizerId === uid) throw new AppError("You can't follow yourself", 400);
  await loadOrganizer(organizerId);

  // upsert → following twice is harmless
  await Follow.updateOne(
    { followerId: toObjectId(uid), followeeId: toObjectId(organizerId) },
    { $setOnInsert: { followerId: toObjectId(uid), followeeId: toObjectId(organizerId) } },
    { upsert: true },
  );

  res.json({
    following: true,
    followersCount: await Follow.countDocuments({ followeeId: organizerId }),
  });
};

export const unfollowOrganizer = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const organizerId = req.params.userId as string;

  await Follow.deleteOne({ followerId: uid, followeeId: organizerId });

  res.json({
    following: false,
    followersCount: await Follow.countDocuments({ followeeId: organizerId }),
  });
};

/* ═══════════════════════════════════════════════════════════════════
   ORGANIZER PROFILE  (public)
═══════════════════════════════════════════════════════════════════ */
export const getOrganizer = async (req: Request, res: Response) => {
  const organizerId = req.params.userId as string;
  const viewerId = req.user?.id;
  const organizer = await loadOrganizer(organizerId);

  const hosted = { $or: [{ createdBy: organizerId }, { coHosts: organizerId }], cancelledAt: null };

  const [followersCount, eventsCount, isFollowing, upcoming] = await Promise.all([
    Follow.countDocuments({ followeeId: organizerId }),
    Event.countDocuments(hosted),
    viewerId
      ? Follow.exists({ followerId: viewerId, followeeId: organizerId })
      : Promise.resolve(null),
    Event.find({ ...hosted, endsAt: { $gte: new Date() } })
      .sort({ startTime: 1 })
      .limit(6),
  ]);

  res.json({
    id: organizer.id,
    name: organizer.name,
    picture: organizer.picture ?? null,
    bio: organizer.bio ?? "",
    followersCount,
    eventsCount,
    isFollowing: !!isFollowing,
    upcomingEvents: upcoming.map((e) => serializeEvent(e, viewerId)),
  });
};

/* ═══════════════════════════════════════════════════════════════════
   WHO I FOLLOW  ·  FEED OF THEIR EVENTS
═══════════════════════════════════════════════════════════════════ */
export const getFollowingOrganizers = async (req: Request, res: Response) => {
  const follows = await Follow.find({ followerId: req.user!.id })
    .sort({ createdAt: -1 })
    .limit(200)
    .select("followeeId");

  const users = await LeafLineUser.find({
    _id: { $in: follows.map((f) => f.followeeId) },
  }).select("name picture");

  res.json({
    organizers: users.map((u) => ({
      id: u.id,
      name: u.name,
      picture: u.picture ?? null,
    })),
  });
};

export const getFollowingFeed = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const { page, limit } = res.locals.query as { page: number; limit: number };

  const follows = await Follow.find({ followerId: uid }).select("followeeId");
  const organizerIds = follows.map((f) => f.followeeId);

  const filter = {
    $or: [{ createdBy: { $in: organizerIds } }, { coHosts: { $in: organizerIds } }],
    endsAt: { $gte: new Date() },
    cancelledAt: null,
  };

  const [events, total] =
    organizerIds.length === 0
      ? [[], 0]
      : await Promise.all([
          Event.find(filter)
            .sort({ startTime: 1 })
            .skip((page - 1) * limit)
            .limit(limit),
          Event.countDocuments(filter),
        ]);

  res.json({
    total,
    page,
    pages: Math.ceil(total / limit),
    events: events.map((e) => serializeEvent(e, uid)),
  });
};

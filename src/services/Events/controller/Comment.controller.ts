import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment } from "../model/comment.model";
import { Event } from "../model/events.model";
import { LeafLineUser } from "../../../MainAuth/signup/model/user.model";

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

/* ═══════════════════════════════════════════════════════════════════
   ADD COMMENT / REPLY
═══════════════════════════════════════════════════════════════════ */
export const addComment = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const user = await LeafLineUser.findById(req.user.id).select("name picture");
    if (!user)  return res.status(404).json({ message: "User not found" });

    const { text, parentId } = req.body;

    // Validate parent if replying
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) return res.status(404).json({ message: "Parent comment not found" });
      if (parent.eventId.toString() !== req.params.id)
        return res.status(400).json({ message: "Comment does not belong to this event" });
    }

    const comment = await Comment.create({
      eventId:    req.params.id,
      userId:     req.user.id,
      userName:   user.name,
      userAvatar: (user as any).picture?.url ?? null,
      text,
      parentId:   parentId ?? null,
    });

    res.status(201).json({ message: "Comment added", comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   GET COMMENTS  (top-level, paginated)
═══════════════════════════════════════════════════════════════════ */
export const getComments = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [comments, total] = await Promise.all([
      Comment.find({ eventId: req.params.id, parentId: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("replyCount"),
      Comment.countDocuments({ eventId: req.params.id, parentId: null }),
    ]);

    res.json({
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      comments,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   GET REPLIES
═══════════════════════════════════════════════════════════════════ */
export const getReplies = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [replies, total] = await Promise.all([
      Comment.find({ parentId: req.params.commentId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Comment.countDocuments({ parentId: req.params.commentId }),
    ]);

    res.json({ total, page: Number(page), pages: Math.ceil(total / Number(limit)), replies });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   UPDATE COMMENT  (owner only)
═══════════════════════════════════════════════════════════════════ */
export const updateComment = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not allowed" });

    comment.text = req.body.text;
    await comment.save();
    res.json({ message: "Comment updated", comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   DELETE COMMENT  (owner only — also deletes replies)
═══════════════════════════════════════════════════════════════════ */
export const deleteComment = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not allowed" });

    await Promise.all([
      Comment.findByIdAndDelete(req.params.commentId),
      Comment.deleteMany({ parentId: req.params.commentId }),
    ]);

    res.json({ message: "Comment deleted" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   TOGGLE LIKE
═══════════════════════════════════════════════════════════════════ */
export const toggleLike = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const uid = req.user.id;
    const idx = comment.likes.findIndex((id) => id.toString() === uid);

    if (idx >= 0) comment.likes.splice(idx, 1);
    else          comment.likes.push(toObjectId(uid));

    await comment.save();
    res.json({ likes: comment.likes.length, comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
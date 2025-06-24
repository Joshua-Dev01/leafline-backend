import { Request, Response } from "express";
import { Blog } from "../../createBlog/models/blog.model";
import { AuthenticatedRequest } from "../types/reactions";
import { Types } from "mongoose";

// ✅ Toggle Like
export const toggleLike = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    const userId = new Types.ObjectId(req.user._id);

    const alreadyLiked = blog.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      blog.likes = blog.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      blog.likes.push(userId);
    }

    await blog.save();

    res.status(200).json({
      message: alreadyLiked ? "Unliked" : "Liked",
      likesCount: blog.likes.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error liking blog" });
  }
};

// ✅ Add Comment
export const addComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text)
      return res.status(400).json({ message: "Comment text is required" });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.comments.push({
      user: req.user._id,
      text,
    });

    await blog.save();

    res.status(201).json({
      message: "Comment added",
      comments: blog.comments,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error adding comment" });
  }
};

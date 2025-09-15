import { Blog } from "../../createBlog/models/blog.model";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/reactions";

// ✅ Reply to a comment
export const replyToComment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { text } = req.body;
  const { id: blogId, commentId } = req.params;

  if (!text) return res.status(400).json({ message: "Reply text is required" });

  const blog = await Blog.findById(blogId);
  if (!blog) return res.status(404).json({ message: "Blog not found" });

  const comment = blog.comments.id(commentId);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  comment.replies.push({
    user: req.user.id,
    text,
  });

  await blog.save();
  res.status(201).json({ message: "Reply added", replies: comment.replies });
};

import { Response } from "express";
import { AuthenticatedRequest } from "../types/reactions";
import { Blog } from "../../createBlog/models/blog.model";


export const deleteComment = async (req: AuthenticatedRequest, res: Response) => {
  const { id: blogId, commentId } = req.params;

  const blog = await Blog.findById(blogId);
  if (!blog) return res.status(404).json({ message: "Blog not found" });

  const comment = blog.comments.id(commentId);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  const isOwner = comment.user.toString() === req.user.id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: "You can only delete your own comments" });
  }

  comment.deleteOne();
  await blog.save();

  res.status(200).json({ message: "Comment deleted successfully" });
};

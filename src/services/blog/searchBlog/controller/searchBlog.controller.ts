import { Request, Response } from "express";
import { Blog } from "../../createBlog/models/blog.model";

export const searchBlogs = async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(400).json({ message: "Search query missing" });
  }

  const blogs = await Blog.find({
    $or: [
      { title: { $regex: q, $options: "i" } },
      { content: { $regex: q, $options: "i" } }
    ]
  }).populate("author", "name email");

  res.status(200).json(blogs);
};

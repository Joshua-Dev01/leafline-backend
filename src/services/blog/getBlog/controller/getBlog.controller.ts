import { Request, Response } from "express";
import { Blog } from "../../createBlog/models/blog.model";

export const getAllBlogs = async (req: Request, res: Response) => {
  const { category } = req.query;

  const filter = category ? { category } : {};

  const blogs = await Blog.find(filter)
    .populate("author", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(blogs);
};

export const getBlogById = async (req: Request, res: Response) => {
  const blog = await Blog.findById(req.params.id).populate(
    "author",
    "name email"
  );
  if (!blog) return res.status(404).json({ message: "Blog not found" });

  res.status(200).json(blog);
};

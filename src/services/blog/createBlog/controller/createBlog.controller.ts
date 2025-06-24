import { Request, Response } from "express";
import { Blog } from "../models/blog.model";
import slugify from "slugify";

export const createBlog = async (req: Request, res: Response) => {
  const { title, content, coverImage, category } = req.body;
  const userId = req.user?.id;

  if (!title || !content) {
    return res.status(400).json({ message: "Title and content are required" });
  }

  const slug = slugify(title, { lower: true, strict: true });

  const blog = await Blog.create({
    title,
    slug,
    content,
    coverImage,
    category,
    author: userId,
  });

  res.status(201).json(blog);
};

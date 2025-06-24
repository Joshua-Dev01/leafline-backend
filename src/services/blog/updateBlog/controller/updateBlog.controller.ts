import { Request, Response } from "express";
import slugify from "slugify";
import { Blog } from "../../createBlog/models/blog.model";

export const updateBlog = async (req: Request, res: Response) => {
  const { title, content, coverImage, category } = req.body;

  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ message: "Blog not found" });

  if (title) {
    blog.title = title;
    blog.slug = slugify(title, { lower: true, strict: true });
  }
  if (content) blog.content = content;
  if (coverImage) blog.coverImage = coverImage;
  if (category) blog.category = category;

  await blog.save();
  res.status(200).json(blog);
};

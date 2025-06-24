import { Request, Response } from "express";
import { Blog } from "../../createBlog/models/blog.model";

export const deleteBlog = async (req: Request, res: Response) => {
  const blog = await Blog.findByIdAndDelete(req.params.id);
  if (!blog) return res.status(404).json({ message: "Blog not found" });

  res.status(200).json({ message: "Blog deleted successfully" });
};

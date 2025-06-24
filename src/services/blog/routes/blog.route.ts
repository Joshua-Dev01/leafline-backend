import express from "express";
import createBlogRouter from "../createBlog/routes/createBlog.routes";
import getBlogRouter from "../getBlog/routes/getBlog.routes";
import updateBlogRouter from "../updateBlog/routes/updateBlog.routes";
import deleteBlogRouter from "../deleteBlog/routes/deleteBlog.routes";
import searchBlogRouter from "../searchBlog/routes/search.route";
import reactionBlogRouter from "../reactions/routes/blogReactions.route";

const BlogRouter = express.Router();

BlogRouter.use(createBlogRouter);
BlogRouter.use(getBlogRouter);
BlogRouter.use(updateBlogRouter);
BlogRouter.use(deleteBlogRouter);
BlogRouter.use(searchBlogRouter);
BlogRouter.use(reactionBlogRouter);

export default BlogRouter;

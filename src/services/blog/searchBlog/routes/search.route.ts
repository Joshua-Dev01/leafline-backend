import express from "express";
import catchAsync from "../../../../auth/utils/catchAsync";
import { searchBlogs } from "../../searchBlog/controller/searchBlog.controller";

const searchBlogRouter = express.Router();

searchBlogRouter.get("/search/query", catchAsync(searchBlogs));

export default searchBlogRouter;

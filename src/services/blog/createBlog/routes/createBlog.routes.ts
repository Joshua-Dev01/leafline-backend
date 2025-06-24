import express from "express";
import { protect } from "../../../../auth/middleware/protect";
import { checkAdmin } from "../../../admin/middleware/checkAdmin.middleware";
import { createBlog } from "../controller/createBlog.controller";
import catchAsync from "../../../../auth/utils/catchAsync";

const createBlogRouter = express.Router();

createBlogRouter.post(
  "/create-blog",
  catchAsync(protect),
  catchAsync(checkAdmin),
  catchAsync(createBlog)
);

export default createBlogRouter;

import express from "express";
import catchAsync from "../../../../auth/utils/catchAsync";
import { checkAdmin } from "../../../admin/middleware/checkAdmin.middleware";
import { protect } from "../../../../auth/middleware/protect";
import { updateBlog } from "../controller/updateBlog.controller";

const updateBlogRouter = express.Router();



updateBlogRouter.put(
  "/:id",
  catchAsync(protect), catchAsync(checkAdmin),
  catchAsync(updateBlog)
);

export default updateBlogRouter;

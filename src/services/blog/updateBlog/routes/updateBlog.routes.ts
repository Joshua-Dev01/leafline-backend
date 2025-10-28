import express from "express";
import catchAsync from "../../../../utils/catchAsync";
import { checkAdmin } from "../../../admin/middleware/checkAdmin.middleware";
import { protect } from "../../../../MainAuth/middleware/protect";
import { updateBlog } from "../controller/updateBlog.controller";

const updateBlogRouter = express.Router();



updateBlogRouter.put(
  "/:id",
  catchAsync(protect), catchAsync(checkAdmin),
  catchAsync(updateBlog)
);

export default updateBlogRouter;

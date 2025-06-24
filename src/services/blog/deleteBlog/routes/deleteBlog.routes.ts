import express from "express";
import { protect } from "../../../../auth/middleware/protect";
import { checkAdmin } from "../../../admin/middleware/checkAdmin.middleware";
import catchAsync from "../../../../auth/utils/catchAsync";
import { deleteBlog } from "../controller/deleteBlog.controller";

const deleteBlogRouter = express.Router();

deleteBlogRouter.delete(
  "/:id",
  catchAsync(protect),
  catchAsync(checkAdmin),
  catchAsync(deleteBlog)
);

export default deleteBlogRouter;

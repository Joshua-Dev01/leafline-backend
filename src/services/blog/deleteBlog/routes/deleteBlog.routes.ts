import express from "express";
import { protect } from "../../../../MainAuth/middleware/protect";
import { checkAdmin } from "../../../admin/middleware/checkAdmin.middleware";
import catchAsync from "../../../../utils/catchAsync";
import { deleteBlog } from "../controller/deleteBlog.controller";

const deleteBlogRouter = express.Router();

deleteBlogRouter.delete(
  "/:id",
  catchAsync(protect),
  catchAsync(checkAdmin),
  catchAsync(deleteBlog)
);

export default deleteBlogRouter;

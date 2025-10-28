import express from "express";
import catchAsync from "../../../../utils/catchAsync";
import { getAllBlogs, getBlogById } from "../controller/getBlog.controller";

const getBlogRouter = express.Router();

getBlogRouter.get(
  "/get-blog",
  catchAsync(getAllBlogs)
);


getBlogRouter.get(
  "/:id",
  catchAsync(getBlogById)
);

export default getBlogRouter;

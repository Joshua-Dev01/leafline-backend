import express from "express";
import catchAsync from "../../../../auth/utils/catchAsync";
import { addComment, toggleLike } from "../controller/reactions.controller";
import { protect } from "../../../../auth/middleware/protect";
import { replyToComment } from "../controller/replyComments.controller";
import { deleteComment } from "../controller/deleteComment.controller";

const reactionBlogRouter = express.Router();

reactionBlogRouter.post(
  "/:id/like",
  catchAsync(protect),
  catchAsync(toggleLike)
);

reactionBlogRouter.post(
  "/:id/comment",
  catchAsync(protect),
  catchAsync(addComment)
);

reactionBlogRouter.post(
  "/:id/comment/:commentId/reply",
  catchAsync(protect),
  catchAsync(replyToComment)
);
reactionBlogRouter.delete(
  "/:id/comment/:commentId",
  catchAsync(protect),
  catchAsync(deleteComment)
);

export default reactionBlogRouter;

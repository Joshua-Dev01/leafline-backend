import express from "express";

import { protect } from "../../middleware/protect";
import { upload } from "../../middleware/upload";
import catchAsync from "../../../utils/catchAsync";
import { deleteProfilePicture, getProfilePicture, uploadProfilePicture } from "../dp.controller";

const PicturesRouter = express.Router();

PicturesRouter.post(
  "/upload-dp",
  catchAsync(protect),
  upload.single("image"),
  catchAsync(uploadProfilePicture)
);

PicturesRouter.get("/dp", catchAsync(protect), catchAsync(getProfilePicture));
PicturesRouter.delete(
  "/delete-dp",
  catchAsync(protect),
  catchAsync(deleteProfilePicture)
);

export default PicturesRouter;

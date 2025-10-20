import express from "express";
import {
  deleteUserPicture,
  getUserPicture,
  uploadPicture,
} from "../uploadPicture";
import { protect } from "../../middleware/protect";
import { upload } from "../../middleware/upload";
import catchAsync from "../../utils/catchAsync";

const PicturesRouter = express.Router();

PicturesRouter.put(
  "/upload-picture",
  catchAsync(protect),
  upload.single("picture"),
  catchAsync(uploadPicture)
);

PicturesRouter.get("/", catchAsync(protect), catchAsync(getUserPicture));
PicturesRouter.delete(
  "/delete-picture",
  catchAsync(protect),
  catchAsync(deleteUserPicture)
);

export default PicturesRouter;

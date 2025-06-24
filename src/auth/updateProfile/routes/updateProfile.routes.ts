import express from "express";
import { protect } from "../../middleware/protect";
import { updateProfile } from "../controller/updateProfile.controller";
import catchAsync from "../../utils/catchAsync";

const updateProfileRouter = express.Router();

updateProfileRouter.put(
  "/update-profile",
  catchAsync(protect),
  catchAsync(updateProfile)
);

export default updateProfileRouter;

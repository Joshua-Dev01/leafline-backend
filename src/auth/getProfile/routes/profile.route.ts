import express from "express";
import { protect } from "../../middleware/protect";
import { getProfile } from "../controller/profile.controller";
import catchAsync from "../../utils/catchAsync";

const profileRouter = express.Router();

profileRouter.get("/profile", catchAsync(protect), catchAsync(getProfile));

export default profileRouter;

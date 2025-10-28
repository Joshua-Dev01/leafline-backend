import express from "express";
import catchAsync from "../../../utils/catchAsync";
import { googleAuth } from "../googleAuths.controller";

const googleAuthRouter = express.Router();

googleAuthRouter.post("/googleAuth", catchAsync(googleAuth));

export default googleAuthRouter;

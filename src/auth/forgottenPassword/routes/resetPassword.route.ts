import express from "express";
import catchAsync from "../../utils/catchAsync";
import { forgotPassword } from "../controller/forgotPassword.controller";
import { resetPassword } from "../controller/resetPassword.controller";

const resetPasswordRouter = express.Router();

resetPasswordRouter.post("/forgot-password", catchAsync(forgotPassword));
resetPasswordRouter.post("/reset-password", catchAsync(resetPassword));

export default resetPasswordRouter;

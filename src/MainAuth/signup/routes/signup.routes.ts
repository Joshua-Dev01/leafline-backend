import express from "express";
import { signup } from "../controller/SignUp.controller";
import catchAsync from "../../../utils/catchAsync";
import { verifyEmail } from "../controller/verifyEmail.controller";
import { resendVerificationEmail } from "../controller/resendEmail.controller";
import { login } from "../../login/login.controller";
import { forgotPassword } from "../../resetPassword/forgotPassword.controller";
import { resetPassword } from "../../resetPassword/resetPassword.controller";
import { changePassword } from "../../changePassword/changePassword.controller";
import { protect } from "../../middleware/protect";
import { getProfile } from "../../profileDetails/profile.controller";
import { updateProfile } from "../../updateProfile/updateprofile";
import { deleteAccount } from "../../deleteAccount/deleteAccount";
import { googleAuth } from "../../googleAuth/googleAuths.controller";

const signupRouter = express.Router();

signupRouter.post("/signup", catchAsync(signup));
signupRouter.post("/verify-email", catchAsync(verifyEmail));
signupRouter.post("/resend-email", catchAsync(resendVerificationEmail));
signupRouter.post("/login", catchAsync(login));
signupRouter.post("/forgot-password", catchAsync(forgotPassword));
signupRouter.post("/reset-password/:token", catchAsync(resetPassword));
signupRouter.post(
  "/change-password",
  catchAsync(protect),
  catchAsync(changePassword)
);
signupRouter.get("/profile", catchAsync(protect), catchAsync(getProfile));
signupRouter.put(
  "/update-profile",
  catchAsync(protect),
  catchAsync(updateProfile)
);
signupRouter.delete(
  "/delete-account",
  catchAsync(protect),
  catchAsync(deleteAccount)
);
signupRouter.post("/googleAuth",  catchAsync(googleAuth));
// mainAuthRouter.post("/google-signup", catchAsync(googleSignup));
// mainAuthRouter.post("/verify-email", catchAsync(verifyEmailCode));
// mainAuthRouter.post("/resend-code", catchAsync(resendVerificationCode));

export default signupRouter;

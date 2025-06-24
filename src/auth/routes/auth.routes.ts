import { Router } from "express";
import loginRouter from "../login/routes/login.routes";
import registerRouter from "../register/routes/register.routes";
import profileRouter from "../getProfile/routes/profile.route";
import updateProfileRouter from "../updateProfile/routes/updateProfile.routes";
import resetPasswordRouter from "../forgottenPassword/routes/resetPassword.route";
import deleteAccountRouter from "../deleteAccount/routes/deleteAccount.route";

const authRouter = Router();

authRouter.use(registerRouter);
authRouter.use(loginRouter);
authRouter.use(profileRouter);
authRouter.use(updateProfileRouter);
authRouter.use(resetPasswordRouter);
authRouter.use(deleteAccountRouter);

export default authRouter;

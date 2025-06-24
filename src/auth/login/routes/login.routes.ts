import express from "express";
import { login } from "../controllers/login.controller";
import catchAsync from "../../utils/catchAsync";

const loginRouter = express.Router();

loginRouter.post("/login", catchAsync(login));

export default loginRouter;

import express from "express";
import catchAsync from "../../utils/catchAsync";
import { register } from "../controllers/register.controller";

const registerRouter = express.Router();

registerRouter.post("/register", catchAsync(register));

export default registerRouter;

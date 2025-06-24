import express from "express";
import { protect } from "../../middleware/protect";
import { deleteAccount } from "../controller/deleteAccount.controller";
import catchAsync from "../../utils/catchAsync";

const deleteAccountRouter = express.Router();

deleteAccountRouter.delete(
  "/delete-account",
  catchAsync(protect),
  catchAsync(deleteAccount)
);

export default deleteAccountRouter;
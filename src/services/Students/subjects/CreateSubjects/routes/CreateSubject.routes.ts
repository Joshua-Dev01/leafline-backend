// src/modules/subjects/routes/CreateSubject.routes.ts
import express from "express";
import { createSubject } from "../controllers/CreateSubject.controller";
import catchAsync from "../../../../../auth/utils/catchAsync";
import { protect } from "../../../../../auth/middleware/protect";

const createSubjectsRouter = express.Router();

createSubjectsRouter.post(
  "/add-subjects",
  catchAsync(protect),
  catchAsync(createSubject)
);

console.log("✅ CreateSubjectsRouter loaded"); // confirm load

export default createSubjectsRouter;

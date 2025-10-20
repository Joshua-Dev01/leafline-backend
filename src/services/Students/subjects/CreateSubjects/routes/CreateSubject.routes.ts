// src/modules/subjects/routes/Subject.routes.ts
import express from "express";
import catchAsync from "../../../../../auth/utils/catchAsync";
import { protect } from "../../../../../auth/middleware/protect";
import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from "../controllers/CreateSubject.controller";

const subjectsRouter = express.Router();

// All routes protected
subjectsRouter.use(catchAsync(protect));

// CREATE
subjectsRouter.post("/add-subjects", catchAsync(createSubject));

// READ
subjectsRouter.get("/", catchAsync(getAllSubjects)); // get all subjects
subjectsRouter.get("/:id", catchAsync(getSubjectById)); // get single subject

// UPDATE
subjectsRouter.put("/:id", catchAsync(updateSubject));

// DELETE
subjectsRouter.delete("/:id", catchAsync(deleteSubject));



export default subjectsRouter;

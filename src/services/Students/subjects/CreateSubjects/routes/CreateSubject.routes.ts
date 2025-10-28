// src/modules/subjects/routes/Subject.routes.ts
import express from "express";
import catchAsync from "../../../../../utils/catchAsync";
import { protect } from "../../../../../MainAuth/middleware/protect";
import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from "../controllers/CreateSubject.controller";
import NotesRouter from "../../../Pdf/routes/note.routes";

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

subjectsRouter.use("/notes", NotesRouter)



export default subjectsRouter;

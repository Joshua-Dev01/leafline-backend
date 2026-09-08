// src/modules/subjects/routes/Subject.routes.ts
import express from "express";

import { createSubject, deleteSubject, getAllSubjects, getSubjectById, updateSubject } from "../../subjects/CreateSubjects/controllers/CreateSubject.controller";
import catchAsync from "../../../../utils/catchAsync";
import { protect } from "../../../../MainAuth/middleware/protect";


const subjectsRouter = express.Router();

// All routes protected
subjectsRouter.use(catchAsync(protect));

// The /notes sub-router must be mounted BEFORE the generic /:id routes below.
// Otherwise a request to /subjects/notes matches /subjects/:id first (with
// id="notes") and the notes router is never reached — this was confirmed by
// actually running the app: GET /subjects/notes returned "Subject not found"
// from getSubjectById instead of the notes list.
// subjectsRouter.use("/notes", NotesRouter); // Commented out because NotesRouter is not defined

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
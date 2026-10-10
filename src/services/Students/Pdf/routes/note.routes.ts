// routes/note.routes.ts
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import {
  autosaveNote,
  createNote,
  deleteNote,
  getAllNotesForUser,
  getNoteById,
  getNotesBySubject,
  updateNote,
} from "../controller/note.controller";
import catchAsync from "../../../../utils/catchAsync";

const NotesRouter = express.Router();

const uploadDir = path.join(process.cwd(), "uploads", "notes");
// Multer will not create this directory itself — without this, the very
// first file upload on a fresh clone/deploy fails with ENOENT.
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir }); // or Cloudinary later

// protect() is already applied once for this whole router at the parent
// (subjectsRouter.use(catchAsync(protect))), so it isn't repeated per-route here.
NotesRouter.get("/", catchAsync(getAllNotesForUser));
NotesRouter.post("/:subjectId", upload.single("file"), catchAsync(createNote));
NotesRouter.get("/:subjectId", catchAsync(getNotesBySubject));
NotesRouter.get("/single/:id", catchAsync(getNoteById));
NotesRouter.patch("/autosave/:id", catchAsync(autosaveNote));
NotesRouter.put("/:id", upload.single("file"), catchAsync(updateNote));
NotesRouter.delete("/:id", catchAsync(deleteNote));

export default NotesRouter;
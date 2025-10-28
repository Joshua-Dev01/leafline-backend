// routes/note.routes.ts
import express from "express";
import multer from "multer";
import { protect } from "../../../../MainAuth/middleware/protect";
import { createNote, deleteNote, getNoteById, getNotesBySubject, updateNote } from "../controller/note.controller";
import catchAsync from "../../../../utils/catchAsync";


const NotesRouter = express.Router();
const upload = multer({ dest: "uploads/notes/" }); // or Cloudinary later

NotesRouter.post("/:subjectId", catchAsync(protect), upload.single("file"), catchAsync(createNote));
NotesRouter.get("/:subjectId", catchAsync(protect), getNotesBySubject);
NotesRouter.get("/single/:id", catchAsync(protect), catchAsync(getNoteById));
NotesRouter.put("/:id", catchAsync(protect), upload.single("file"), catchAsync(updateNote));
NotesRouter.delete("/:id", catchAsync(protect), catchAsync(deleteNote));

export default NotesRouter;

// src/services/Notes/controllers/note.controller.ts
import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { Subject } from "../../subjects/CreateSubjects/models/subject.model";
import { createNotification } from "../../../Notifications/services/notification.service";
import { Note } from "../model/note.model";

/**
 * Helper to convert cloudinary resource_type / format into friendly category
 */
const deriveFileType = (resource_type?: string, mimeType?: string) => {
  if (!resource_type && mimeType) {
    if (mimeType.includes("image")) return "image";
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("msword") ||
      mimeType.includes("officedocument")
    )
      return "document";
    if (mimeType.includes("video")) return "video";
    return "file";
  }

  if (resource_type === "image") return "image";
  if (resource_type === "video") return "video";
  if (resource_type === "raw") return "file";
  return resource_type || "file";
};

/**
 * FormData can't carry real arrays — the frontend sends tags as a
 * JSON-stringified array (or a plain comma-separated string as a fallback).
 */
const parseTags = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).map((t) => t.trim()).filter(Boolean);
  } catch {
    // not JSON — fall back to comma-separated
  }
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};

// Create new note under a subject
export const createNote = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const { title, description, content } = req.body;

    if (!req.user?.id)
      return res.status(401).json({ message: "Unauthorized: User not found" });

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Title is required" });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    if (subject.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: Not allowed" });
    }

    let uploadedFile: any = null;

    // If multer attached file
    if (req.file) {
      uploadedFile = await cloudinary.uploader.upload(req.file.path, {
        folder: "leafline/notes",
        resource_type: "auto",
      });

      // The file now lives on Cloudinary — remove the local temp copy multer
      // left behind, otherwise every upload leaks disk space permanently.
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn("Failed to remove temp upload file:", err);
      });
    }

    const note = await Note.create({
      userId: req.user.id,
      subjectId,
      title,
      description,
      content: content ?? "",
      tags: parseTags(req.body.tags),
      fileUrl: uploadedFile?.secure_url || undefined,
      filePublicId: uploadedFile?.public_id || undefined,
      fileSize: uploadedFile?.bytes ?? (req.file ? req.file.size : undefined),
      fileType: deriveFileType(
        uploadedFile?.resource_type,
        uploadedFile?.format
      ),
      fileMimeType: uploadedFile?.format || req.file?.mimetype,
    });

    await createNotification({
      userId: req.user.id,
      title: "New Note Added",
      message: `You uploaded a new note: ${title}`,
    });

    return res.status(201).json({ message: "Note created successfully", note });
  } catch (err) {
    console.error("Create Note Error:", err);
    return res
      .status(500)
      .json({ message: "Failed to create note", error: err });
  }
};

// Get ALL of the current user's notes across every subject — powers the
// unified "Study Notes" view (filterable by subject pill, not subject-first).
export const getAllNotesForUser = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    const {
      search,
      subjectId,
      tag,
      sortBy = "createdAt",
      order = "desc",
      page = "1",
      limit = "12",
    } = req.query;

    const query: any = { userId: req.user.id };
    if (subjectId && typeof subjectId === "string") query.subjectId = subjectId;
    if (tag && typeof tag === "string") query.tags = tag;
    if (search && typeof search === "string") {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sort: any = {};
    sort[String(sortBy)] = order === "desc" ? -1 : 1;

    const pageNum = Math.max(1, Number(page));
    const perPage = Math.max(1, Number(limit));

    const [notes, total] = await Promise.all([
      Note.find(query)
        .populate("subjectId", "name code")
        .sort(sort)
        .skip((pageNum - 1) * perPage)
        .limit(perPage),
      Note.countDocuments(query),
    ]);

    return res.status(200).json({
      total,
      page: pageNum,
      perPage,
      totalPages: Math.ceil(total / perPage),
      notes,
    });
  } catch (err) {
    console.error("Get All Notes Error:", err);
    return res.status(500).json({ message: "Failed to fetch notes", error: err });
  }
};

// Get notes by subject with search, sort, pagination
export const getNotesBySubject = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const {
      search,
      sortBy = "createdAt",
      order = "desc",
      page = "1",
      limit = "12",
    } = req.query;

    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    const query: any = {
      subjectId,
      userId: req.user.id, // only this user's notes
    };

    if (search && typeof search === "string") {
      query.title = { $regex: search, $options: "i" };
    }

    const sort: any = {};
    sort[String(sortBy)] = order === "desc" ? -1 : 1;

    const pageNum = Math.max(1, Number(page));
    const perPage = Math.max(1, Number(limit));

    const [notes, total] = await Promise.all([
      Note.find(query)
        .sort(sort)
        .skip((pageNum - 1) * perPage)
        .limit(perPage),
      Note.countDocuments(query),
    ]);

    return res.status(200).json({
      total,
      page: pageNum,
      perPage,
      totalPages: Math.ceil(total / perPage),
      notes,
    });
  } catch (err) {
    console.error("Get Notes Error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch notes", error: err });
  }
};

// Get single note (owner only)
export const getNoteById = async (req: Request, res: Response) => {
  try {
    const note = await Note.findById(req.params.id).populate("subjectId", "name code");
    if (!note) return res.status(404).json({ message: "Note not found" });

    if (note.userId.toString() !== req.user?.id) {
      return res.status(403).json({ message: "Forbidden: Not allowed" });
    }

    return res.status(200).json({ note });
  } catch (err) {
    console.error("Get Note Error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch note", error: err });
  }
};

// Update note (owner only)
export const updateNote = async (req: Request, res: Response) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    if (note.userId.toString() !== req.user?.id) {
      return res.status(403).json({ message: "Forbidden: Not allowed" });
    }

    // If new file uploaded -> replace in cloudinary
    if (req.file) {
      if (note.filePublicId) {
        try {
          await cloudinary.uploader.destroy(note.filePublicId);
        } catch (e) {
          // non-fatal
          console.warn("Cloudinary destroy failed:", e);
        }
      }

      const uploadedFile = await cloudinary.uploader.upload(req.file.path, {
        folder: "leafline/notes",
        resource_type: "auto",
      });

      fs.unlink(req.file.path, (err) => {
        if (err) console.warn("Failed to remove temp upload file:", err);
      });

      note.fileUrl = uploadedFile.secure_url;
      note.filePublicId = uploadedFile.public_id;
      note.fileSize = uploadedFile.bytes ?? req.file.size;
      note.fileType = deriveFileType(
        uploadedFile.resource_type,
        uploadedFile.format
      );
      note.fileMimeType = uploadedFile.format || req.file.mimetype;
    }

    note.title = req.body.title || note.title;
    note.description = req.body.description ?? note.description;
    if (req.body.content !== undefined) note.content = req.body.content;
    if (req.body.tags !== undefined) note.tags = parseTags(req.body.tags);

    await note.save();

    return res.status(200).json({ message: "Note updated successfully", note });
  } catch (err) {
    console.error("Update Note Error:", err);
    return res
      .status(500)
      .json({ message: "Failed to update note", error: err });
  }
};

// Lightweight autosave — called frequently (debounced) from the note editor.
// Deliberately skips multer/Cloudinary entirely: it only ever touches
// title/content/tags, never the file, so it stays fast under frequent calls.
export const autosaveNote = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: Not allowed" });
    }

    if (req.body.title !== undefined) note.title = req.body.title;
    if (req.body.content !== undefined) note.content = req.body.content;
    if (req.body.tags !== undefined) note.tags = parseTags(req.body.tags);

    await note.save();

    return res.status(200).json({
      message: "Saved",
      note: { _id: note._id, updatedAt: note.updatedAt },
    });
  } catch (err) {
    console.error("Autosave Note Error:", err);
    return res.status(500).json({ message: "Autosave failed", error: err });
  }
};

// Delete note (owner only)
export const deleteNote = async (req: Request, res: Response) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    if (note.userId.toString() !== req.user?.id) {
      return res.status(403).json({ message: "Forbidden: Not allowed" });
    }

    if (note.filePublicId) {
      try {
        await cloudinary.uploader.destroy(note.filePublicId);
      } catch (e) {
        console.warn("Cloudinary destroy failed:", e);
      }
    }

    await note.deleteOne();

    return res.status(200).json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("Delete Note Error:", err);
    return res
      .status(500)
      .json({ message: "Failed to delete note", error: err });
  }
};
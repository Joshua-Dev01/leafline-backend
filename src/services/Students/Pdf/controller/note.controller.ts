import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import { Subject } from "../../subjects/CreateSubjects/models/subject.model";
import { Note } from "../model/note.model";
import { createNotification } from "../../../Notifications/services/notification.service";


// Create new note under a subject
export const createNote = async (req: Request, res: Response) => {
    try {
        const { subjectId } = req.params;
        const { title, description } = req.body;

        if (!req.user?.id)
            return res.status(401).json({ message: "Unauthorized: User not found" });

        const subject = await Subject.findById(subjectId);
        if (!subject)
            return res.status(404).json({ message: "Subject not found" });

        let uploadedFile;
        if (req.file) {
            uploadedFile = await cloudinary.uploader.upload(req.file.path, {
                folder: "leafline/notes",
                resource_type: "auto",
            });
        }

        const note = await Note.create({
            userId: req.user.id,
            subjectId,
            title,
            description,
            fileUrl: uploadedFile?.secure_url,
            filePublicId: uploadedFile?.public_id,
        });

        await createNotification({
            userId: req.user.id,
            title: "New Note Added",
            message: `You uploaded a new note: ${title}`,
        });

        res.status(201).json({
            message: "Note created successfully",
            note,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create note", error: err });
    }
};

// Get all notes with search, sort, and pagination
export const getNotesBySubject = async (req: Request, res: Response) => {
    try {
        const { subjectId } = req.params;
        const { search, sortBy, order, page = 1, limit = 10 } = req.query;

        const query: any = { subjectId, userId: req.user?.id };
        if (search) query.title = { $regex: search, $options: "i" };

        const sortOptions: any = {};
        if (sortBy) sortOptions[sortBy as string] = order === "desc" ? -1 : 1;

        const notes = await Note.find(query)
            .sort(sortOptions)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await Note.countDocuments(query);

        res.status(200).json({
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            notes,
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch notes", error: err });
    }
};

// Get single note
export const getNoteById = async (req: Request, res: Response) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: "Note not found" });
        res.status(200).json(note);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch note", error: err });
    }
};

// Update note
export const updateNote = async (req: Request, res: Response) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: "Note not found" });

        if (req.file) {
            if (note.filePublicId) await cloudinary.uploader.destroy(note.filePublicId);
            const uploadedFile = await cloudinary.uploader.upload(req.file.path, {
                folder: "leafline/notes",
                resource_type: "auto",
            });
            note.fileUrl = uploadedFile.secure_url;
            note.filePublicId = uploadedFile.public_id;
        }

        note.title = req.body.title || note.title;
        note.description = req.body.description || note.description;

        await note.save();

        res.status(200).json({
            message: "Note updated successfully",
            note,
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to update note", error: err });
    }
};

// Delete note
export const deleteNote = async (req: Request, res: Response) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: "Note not found" });

        if (note.filePublicId) await cloudinary.uploader.destroy(note.filePublicId);

        await note.deleteOne();

        res.status(200).json({ message: "Note deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete note", error: err });
    }
};

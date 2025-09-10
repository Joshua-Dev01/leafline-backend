import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { subjectUpdateValidation, subjectValidation } from "../validations/subject.validations";

// Create a new Subject
export const createSubject = async (req: Request, res: Response) => {
  try {
    const { error } = subjectValidation.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    const subject = new Subject({ ...req.body, userId: req.user.id });
    await subject.save();
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ message: "Failed to create subject", error: err });
  }
};

// Get all subjects
export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await Subject.find({ userId: req.user?.id });
    res.status(200).json(subjects);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch subjects", error: err });
  }
};

// Get single subject by ID
export const getSubjectById = async (req: Request, res: Response) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    if (subject.userId.toString() !== req.user?.id) {
      return res.status(403).json({ message: "Forbidden: Not allowed" });
    }
    res.status(200).json(subject);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch subject", error: err });
  }
};

// Update a subject
export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { error } = subjectUpdateValidation.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    if (subject.userId.toString() !== req.user?.id) {
      return res.status(403).json({ message: "Forbidden: Not allowed" });
    }

    Object.assign(subject, req.body);
    await subject.save();
    res.status(200).json(subject);
  } catch (err) {
    res.status(500).json({ message: "Failed to update subject", error: err });
  }
};

// Delete a subject
export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    if (subject.userId.toString() !== req.user?.id) {
      return res.status(403).json({ message: "Forbidden: Not allowed" });
    }

    await subject.deleteOne();
    res.status(200).json({ message: "Subject deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete subject", error: err });
  }
};

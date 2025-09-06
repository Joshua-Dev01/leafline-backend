import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { subjectValidation } from "../validations/subject.validations";

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

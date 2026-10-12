import mongoose, { Schema, Document } from "mongoose";
import {
  PROJECT_CATEGORIES,
  PROJECT_COLORS,
  PROJECT_ICONS,
  PROJECT_VISIBILITIES,
} from "../utils/project.constants";

// The owner is `createdBy`; everyone else with access is in `collaborators`.
// Tasks live in their own collection (see projectExtras.model.ts) — progress
// is always computed from them, never stored.
export interface IProject extends Document {
  title: string;
  description?: string;
  category: string;
  startDate?: Date;
  deadline?: Date;
  visibility: "private" | "team";
  color: string;
  icon: string;
  createdBy: mongoose.Types.ObjectId;
  collaborators: mongoose.Types.ObjectId[];
  archived: boolean;
  archivedAt?: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000 },
    category: { type: String, enum: PROJECT_CATEGORIES, default: "Other" },
    startDate: { type: Date },
    deadline: { type: Date },
    // Projects created before visibility existed keep working for their collaborators.
    visibility: { type: String, enum: PROJECT_VISIBILITIES, default: "private" },
    color: { type: String, enum: PROJECT_COLORS, default: "violet" },
    icon: { type: String, enum: PROJECT_ICONS, default: "folder" },
    createdBy: { type: Schema.Types.ObjectId, ref: "LeafLineUser", required: true, index: true },
    collaborators: [{ type: Schema.Types.ObjectId, ref: "LeafLineUser", index: true }],
    archived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>("Project", projectSchema);

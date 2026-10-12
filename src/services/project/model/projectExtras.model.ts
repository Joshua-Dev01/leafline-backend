import mongoose, { Schema, Document } from "mongoose";
import { TASK_PRIORITIES, TASK_STATUSES } from "../utils/project.constants";

const ref = (name: string, extra: object = {}) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  ...extra,
});

/* ── Tasks (with embedded subtasks) ───────────────────────────── */
export interface ISubtask {
  _id: mongoose.Types.ObjectId;
  title: string;
  done: boolean;
}

export interface IProjectTask extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assignedTo?: mongoose.Types.ObjectId | null;
  dueDate?: Date | null;
  priority: "low" | "medium" | "high";
  status: "not-started" | "in-progress" | "completed";
  subtasks: mongoose.Types.DocumentArray<ISubtask>;
  createdBy: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subtaskSchema = new Schema<ISubtask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { _id: true }
);

const taskSchema = new Schema<IProjectTask>(
  {
    projectId: ref("Project", { required: true, index: true }),
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    assignedTo: ref("LeafLineUser", { default: null }),
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: TASK_PRIORITIES, default: "medium" },
    status: { type: String, enum: TASK_STATUSES, default: "not-started" },
    subtasks: [subtaskSchema],
    createdBy: ref("LeafLineUser", { required: true }),
    completedAt: { type: Date },
  },
  { timestamps: true }
);
taskSchema.index({ projectId: 1, status: 1 });

export const ProjectTask = mongoose.model<IProjectTask>("ProjectTask", taskSchema);

/* ── Comments (project discussion) ────────────────────────────── */
export interface IProjectComment extends Document {
  projectId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  body: string;
  createdAt: Date;
}

const commentSchema = new Schema<IProjectComment>(
  {
    projectId: ref("Project", { required: true, index: true }),
    authorId: ref("LeafLineUser", { required: true }),
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

export const ProjectComment = mongoose.model<IProjectComment>("ProjectComment", commentSchema);

/* ── Activity history ─────────────────────────────────────────── */
export interface IProjectActivity extends Document {
  projectId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  type: string;
  text: string; // e.g. `completed "EKF Sensor Fusion"` — rendered after the actor's name
  createdAt: Date;
}

const activitySchema = new Schema<IProjectActivity>(
  {
    projectId: ref("Project", { required: true, index: true }),
    actorId: ref("LeafLineUser", { required: true }),
    type: { type: String, required: true },
    text: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
activitySchema.index({ projectId: 1, createdAt: -1 });

export const ProjectActivity = mongoose.model<IProjectActivity>("ProjectActivity", activitySchema);

/* ── Invitations ──────────────────────────────────────────────── */
export interface IProjectInvitation extends Document {
  projectId: mongoose.Types.ObjectId;
  inviterId: mongoose.Types.ObjectId;
  inviteeId: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: Date;
}

const invitationSchema = new Schema<IProjectInvitation>(
  {
    projectId: ref("Project", { required: true, index: true }),
    inviterId: ref("LeafLineUser", { required: true }),
    inviteeId: ref("LeafLineUser", { required: true, index: true }),
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);
// One pending invitation per person per project.
invitationSchema.index(
  { projectId: 1, inviteeId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export const ProjectInvitation = mongoose.model<IProjectInvitation>(
  "ProjectInvitation",
  invitationSchema
);

/* ── Files ────────────────────────────────────────────────────── */
export interface IProjectFile extends Document {
  projectId: mongoose.Types.ObjectId;
  uploaderId: mongoose.Types.ObjectId;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  url: string;
  publicId: string;
  cloudResourceType: "image" | "raw" | "video";
  createdAt: Date;
}

const fileSchema = new Schema<IProjectFile>(
  {
    projectId: ref("Project", { required: true, index: true }),
    uploaderId: ref("LeafLineUser", { required: true }),
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileType: { type: String, required: true },
    mimeType: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    cloudResourceType: { type: String, enum: ["image", "raw", "video"], default: "raw" },
  },
  { timestamps: true }
);

export const ProjectFile = mongoose.model<IProjectFile>("ProjectFile", fileSchema);

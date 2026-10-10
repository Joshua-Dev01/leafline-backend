import mongoose, { Schema, Document } from "mongoose";

export const RESOURCE_CATEGORIES = [
  "study-material",
  "past-question",
  "textbook",
  "lecture-slides",
  "assignment",
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_STATUSES = [
  "pending", // awaiting admin approval
  "approved", // visible in the library
  "rejected", // admin rejected the upload
  "flagged", // auto-hidden after too many reports, awaiting review
] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export interface ILibraryResource extends Document {
  uploaderId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: ResourceCategory;
  courseCode?: string; // e.g. "CSC 301"
  subject?: string; // e.g. "Operating Systems"
  department?: string;
  level?: string; // e.g. "300"
  session?: string; // e.g. "2023/2024" — mainly for past questions
  tags: string[];

  fileUrl: string;
  filePublicId: string;
  fileName: string;
  fileSize: number; // bytes
  fileType: string; // "pdf" | "document" | "presentation" | "spreadsheet" | "image" | "text" | "file"
  fileMimeType?: string;
  cloudResourceType: "image" | "raw" | "video";
  pageCount?: number;
  extractedText?: string; // used by the AI features; never returned by default

  allowDownload: boolean;
  status: ResourceStatus;
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;

  viewCount: number;
  downloadCount: number;
  bookmarkCount: number;
  openReportCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<ILibraryResource>(
  {
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: "LeafLineUser",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: RESOURCE_CATEGORIES,
      required: true,
      index: true,
    },
    courseCode: { type: String, trim: true, uppercase: true, index: true },
    subject: { type: String, trim: true, index: true },
    department: { type: String, trim: true, index: true },
    level: { type: String, trim: true },
    session: { type: String, trim: true },
    tags: { type: [String], default: [] },

    fileUrl: { type: String, required: true },
    filePublicId: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileType: { type: String, required: true },
    fileMimeType: { type: String },
    cloudResourceType: {
      type: String,
      enum: ["image", "raw", "video"],
      default: "raw",
    },
    pageCount: { type: Number },
    extractedText: { type: String, select: false },

    allowDownload: { type: Boolean, default: true },
    status: {
      type: String,
      enum: RESOURCE_STATUSES,
      default: "pending",
      index: true,
    },
    rejectionReason: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "LeafLineUser" },
    reviewedAt: { type: Date },

    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
    openReportCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Common listing paths: approved resources by recency / popularity.
resourceSchema.index({ status: 1, createdAt: -1 });
resourceSchema.index({ status: 1, downloadCount: -1, viewCount: -1 });

export const LibraryResource = mongoose.model<ILibraryResource>(
  "LibraryResource",
  resourceSchema
);
import mongoose, { Schema, Document } from "mongoose";

export const REPORT_REASONS = [
  "incorrect", // wrong / misleading content
  "inappropriate", // offensive or unsuitable
  "unauthorized", // copyrighted or shared without permission
  "duplicate",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportStatus = "open" | "dismissed" | "resolved";

export interface ILibraryReport extends Document {
  resourceId: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolutionNote?: string;
  createdAt: Date;
}

const reportSchema = new Schema<ILibraryReport>(
  {
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: "LibraryResource",
      required: true,
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "LeafLineUser",
      required: true,
    },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["open", "dismissed", "resolved"],
      default: "open",
      index: true,
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "LeafLineUser" },
    resolvedAt: { type: Date },
    resolutionNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A user can only have one open report per resource.
reportSchema.index(
  { resourceId: 1, reporterId: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);

export const LibraryReport = mongoose.model<ILibraryReport>(
  "LibraryReport",
  reportSchema
);
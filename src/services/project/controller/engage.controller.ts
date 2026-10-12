import { Request, Response } from "express";
import {
  deleteLibraryFile,
  deriveFileType,
  toDownloadUrl,
  uploadLibraryFile,
} from "../../Library/utils/library.utils";
import {
  ProjectActivity,
  ProjectComment,
  ProjectFile,
} from "../model/projectExtras.model";
import { MAX_PROJECT_FILES } from "../utils/project.constants";
import { USER_FIELDS, logActivity, paginate, quote } from "../utils/project.helpers";

const toUser = (u: any) =>
  u && typeof u === "object" ? { _id: String(u._id), name: u.name, picture: u.picture } : null;

/* ── Comments ─────────────────────────────────────────────────── */
export const listComments = async (req: Request, res: Response) => {
  const { page, limit, skip } = paginate(req.query, 20);
  const filter = { projectId: req.access!.project._id };
  const [rows, total] = await Promise.all([
    ProjectComment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", USER_FIELDS)
      .lean(),
    ProjectComment.countDocuments(filter),
  ]);
  return res.status(200).json({
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    comments: rows.map((c: any) => ({
      _id: String(c._id),
      body: c.body,
      createdAt: c.createdAt,
      author: toUser(c.authorId),
      canDelete: req.access!.isOwner || String(c.authorId?._id) === req.access!.userId,
    })),
  });
};

export const addComment = async (req: Request, res: Response) => {
  const { project, userId } = req.access!;
  const c = await ProjectComment.create({
    projectId: project._id,
    authorId: userId,
    body: req.body.body,
  });
  await c.populate("authorId", USER_FIELDS);
  return res.status(201).json({
    comment: {
      _id: String(c._id),
      body: c.body,
      createdAt: c.createdAt,
      author: toUser(c.authorId),
      canDelete: true,
    },
  });
};

export const deleteComment = async (req: Request, res: Response) => {
  const { project, userId, isOwner } = req.access!;
  const c = await ProjectComment.findOne({ _id: req.params.commentId, projectId: project._id });
  if (!c) return res.status(404).json({ message: "Comment not found" });
  if (!isOwner && String(c.authorId) !== userId)
    return res.status(403).json({ message: "You can only delete your own comments" });
  await c.deleteOne();
  return res.status(200).json({ message: "Comment deleted" });
};

/* ── Activity ─────────────────────────────────────────────────── */
export const listActivity = async (req: Request, res: Response) => {
  const { page, limit, skip } = paginate(req.query, 20);
  const filter = { projectId: req.access!.project._id };
  const [rows, total] = await Promise.all([
    ProjectActivity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actorId", USER_FIELDS)
      .lean(),
    ProjectActivity.countDocuments(filter),
  ]);
  return res.status(200).json({
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    activity: rows.map((a: any) => ({
      _id: String(a._id),
      type: a.type,
      text: a.text,
      createdAt: a.createdAt,
      actor: toUser(a.actorId),
    })),
  });
};

/* ── Files ────────────────────────────────────────────────────── */
const fileJson = (f: any, canDelete = false) => ({
  _id: String(f._id),
  fileName: f.fileName,
  fileSize: f.fileSize,
  fileType: f.fileType,
  mimeType: f.mimeType,
  createdAt: f.createdAt,
  uploader: toUser(f.uploaderId),
  canDelete,
});

export const listFiles = async (req: Request, res: Response) => {
  const files = await ProjectFile.find({ projectId: req.access!.project._id })
    .select("-url -publicId") // links are only handed out after an access check
    .sort({ createdAt: -1 })
    .populate("uploaderId", USER_FIELDS)
    .lean();
  const { isOwner, userId } = req.access!;
  return res.status(200).json({
    files: files.map((f: any) => fileJson(f, isOwner || String(f.uploaderId?._id) === userId)),
  });
};

// POST /project/:projectId/files — multipart `file` (type + size checked by multer)
export const uploadFile = async (req: Request, res: Response) => {
  const { project, userId } = req.access!;
  if (!req.file) return res.status(400).json({ message: "A file is required" });

  const count = await ProjectFile.countDocuments({ projectId: project._id });
  if (count >= MAX_PROJECT_FILES)
    return res.status(409).json({ message: `A project can hold up to ${MAX_PROJECT_FILES} files` });

  const { buffer, mimetype, originalname, size } = req.file;
  let uploaded;
  try {
    uploaded = await uploadLibraryFile(buffer, mimetype, `leafline/projects/${project._id}`);
  } catch (e) {
    console.error("[Project] file upload failed:", e);
    return res.status(502).json({ message: "The file couldn't be uploaded. Please try again." });
  }

  const file = await ProjectFile.create({
    projectId: project._id,
    uploaderId: userId,
    fileName: originalname,
    fileSize: uploaded.bytes ?? size,
    fileType: deriveFileType(mimetype),
    mimeType: mimetype,
    url: uploaded.url,
    publicId: uploaded.publicId,
    cloudResourceType: uploaded.resourceType,
  });

  await logActivity(project._id, userId, "file.uploaded", `uploaded ${quote(originalname)}`);
  await file.populate("uploaderId", USER_FIELDS);
  return res.status(201).json({ message: "File uploaded", file: fileJson(file, true) });
};

// GET /project/:projectId/files/:fileId/link — viewing + download links (members only)
export const getFileLink = async (req: Request, res: Response) => {
  const f = await ProjectFile.findOne({ _id: req.params.fileId, projectId: req.access!.project._id });
  if (!f) return res.status(404).json({ message: "File not found" });
  return res.status(200).json({
    fileName: f.fileName,
    url: f.url,
    downloadUrl: toDownloadUrl(f.url, f.fileName),
  });
};

export const deleteFile = async (req: Request, res: Response) => {
  const { project, userId, isOwner } = req.access!;
  const f = await ProjectFile.findOne({ _id: req.params.fileId, projectId: project._id });
  if (!f) return res.status(404).json({ message: "File not found" });
  if (!isOwner && String(f.uploaderId) !== userId)
    return res.status(403).json({ message: "Only the uploader or the project owner can remove this file" });

  await f.deleteOne();
  await deleteLibraryFile(f.publicId, f.cloudResourceType);
  await logActivity(project._id, userId, "file.deleted", `removed ${quote(f.fileName)}`);
  return res.status(200).json({ message: "File removed" });
};

import { Request, Response } from "express";
import {
  LibraryResource,
  ILibraryResource,
  RESOURCE_CATEGORIES,
} from "../models/resource.model";
import { LibraryBookmark } from "../models/bookmark.model";
import { LibraryReport } from "../models/report.model";
import { createNotification } from "../../Notifications/services/notification.service";
import {
  deleteLibraryFile,
  deriveFileType,
  escapeRegex,
  extractPdfText,
  parseTags,
  toDownloadUrl,
  uploadLibraryFile,
} from "../utils/library.utils";

/** Fields never sent to the client. Files are reached via /preview and /download. */
const HIDDEN_FIELDS = "-fileUrl -filePublicId -extractedText";

/** Open reports needed before a resource is automatically hidden for review. */
export const REPORT_FLAG_THRESHOLD = 3;

export const isAdminUser = (req: Request) =>
  req.user?.role === "admin" || req.user?.role === "superadmin";

const isOwner = (resource: { uploaderId: any }, req: Request) =>
  resource.uploaderId?._id
    ? resource.uploaderId._id.toString() === req.user?.id
    : resource.uploaderId?.toString() === req.user?.id;

/** Approved resources are public; others are visible to their owner and admins. */
export const canViewResource = (
  resource: Pick<ILibraryResource, "status" | "uploaderId">,
  req: Request
) => resource.status === "approved" || isOwner(resource, req) || isAdminUser(req);

const parsePagination = (query: Request["query"], defaultLimit = 12) => {
  const page = Math.max(1, parseInt(String(query.page ?? "1"), 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(String(query.limit ?? defaultLimit), 10) || defaultLimit)
  );
  return { page, limit, skip: (page - 1) * limit };
};

const paginated = (
  items: unknown[],
  total: number,
  page: number,
  limit: number
) => ({
  total,
  page,
  perPage: limit,
  totalPages: Math.ceil(total / limit),
  resources: items,
});

/** Adds `isBookmarked` to a list of lean resources for the current user. */
const withBookmarkFlags = async (resources: any[], userId: string) => {
  if (!resources.length) return resources;
  const bookmarks = await LibraryBookmark.find({
    userId,
    resourceId: { $in: resources.map((r) => r._id) },
  }).select("resourceId");
  const saved = new Set(bookmarks.map((b) => b.resourceId.toString()));
  return resources.map((r) => ({ ...r, isBookmarked: saved.has(r._id.toString()) }));
};

const SORTS: Record<string, Record<string, 1 | -1>> = {
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
  popular: { downloadCount: -1, bookmarkCount: -1, viewCount: -1, createdAt: -1 },
  downloads: { downloadCount: -1, createdAt: -1 },
  views: { viewCount: -1, createdAt: -1 },
  title: { title: 1 },
};

/* ── Explore / search ──────────────────────────────────────────────── */

// GET /library/resources?q=&category=&courseCode=&subject=&department=&level=&sort=&page=&limit=
export const listResources = async (req: Request, res: Response) => {
  const { q, category, courseCode, subject, department, level, sort } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const query: Record<string, any> = { status: "approved" };

  if (typeof category === "string" && category) {
    if (!(RESOURCE_CATEGORIES as readonly string[]).includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }
    query.category = category;
  }
  // Course codes are stored uppercase; ignore spacing differences ("CSC301" vs "CSC 301").
  if (typeof courseCode === "string" && courseCode.trim()) {
    const compact = escapeRegex(courseCode.trim().replace(/\s+/g, ""));
    query.courseCode = {
      $regex: `^${compact.split("").join("\\s*")}$`,
      $options: "i",
    };
  }
  if (typeof subject === "string" && subject.trim())
    query.subject = { $regex: escapeRegex(subject.trim()), $options: "i" };
  if (typeof department === "string" && department.trim())
    query.department = { $regex: `^${escapeRegex(department.trim())}$`, $options: "i" };
  if (typeof level === "string" && level.trim()) query.level = level.trim();

  if (typeof q === "string" && q.trim()) {
    const rx = { $regex: escapeRegex(q.trim()), $options: "i" };
    query.$or = [
      { title: rx },
      { courseCode: rx },
      { subject: rx },
      { department: rx },
      { description: rx },
      { tags: rx },
    ];
  }

  const sortSpec = SORTS[String(sort)] ?? SORTS.recent;

  const [items, total] = await Promise.all([
    LibraryResource.find(query)
      .select(HIDDEN_FIELDS)
      .populate("uploaderId", "name picture")
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .lean(),
    LibraryResource.countDocuments(query),
  ]);

  const resources = await withBookmarkFlags(items, req.user!.id);
  return res.status(200).json(paginated(resources, total, page, limit));
};

// GET /library/resources/popular?limit=
export const getPopularResources = async (req: Request, res: Response) => {
  const { limit } = parsePagination(req.query, 10);
  const items = await LibraryResource.find({ status: "approved" })
    .select(HIDDEN_FIELDS)
    .populate("uploaderId", "name picture")
    .sort(SORTS.popular)
    .limit(limit)
    .lean();
  return res
    .status(200)
    .json({ resources: await withBookmarkFlags(items, req.user!.id) });
};

// GET /library/resources/recent?limit=
export const getRecentResources = async (req: Request, res: Response) => {
  const { limit } = parsePagination(req.query, 10);
  const items = await LibraryResource.find({ status: "approved" })
    .select(HIDDEN_FIELDS)
    .populate("uploaderId", "name picture")
    .sort(SORTS.recent)
    .limit(limit)
    .lean();
  return res
    .status(200)
    .json({ resources: await withBookmarkFlags(items, req.user!.id) });
};

// GET /library/categories — approved-resource count per category
export const getCategories = async (_req: Request, res: Response) => {
  const counts: { _id: string; count: number }[] = await LibraryResource.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const byKey = new Map(counts.map((c) => [c._id, c.count]));
  return res.status(200).json({
    categories: RESOURCE_CATEGORIES.map((key) => ({
      key,
      count: byKey.get(key) ?? 0,
    })),
  });
};

// GET /library/filters — values to populate the filter dropdowns
export const getFilters = async (_req: Request, res: Response) => {
  const match = { status: "approved" };
  const [departments, subjects, courseCodes, levels] = await Promise.all([
    LibraryResource.distinct("department", match),
    LibraryResource.distinct("subject", match),
    LibraryResource.distinct("courseCode", match),
    LibraryResource.distinct("level", match),
  ]);
  const clean = (arr: (string | null | undefined)[]) =>
    arr.filter((v): v is string => !!v).sort((a, b) => a.localeCompare(b));
  return res.status(200).json({
    departments: clean(departments),
    subjects: clean(subjects),
    courseCodes: clean(courseCodes),
    levels: clean(levels),
  });
};

/* ── My uploads & bookmarks ────────────────────────────────────────── */

// GET /library/resources/mine?status=
export const getMyResources = async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query: Record<string, any> = { uploaderId: req.user!.id };
  if (typeof req.query.status === "string" && req.query.status)
    query.status = req.query.status;

  const [items, total] = await Promise.all([
    LibraryResource.find(query)
      .select(HIDDEN_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LibraryResource.countDocuments(query),
  ]);
  return res.status(200).json(paginated(items, total, page, limit));
};

// GET /library/resources/bookmarks
export const getBookmarkedResources = async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { userId: req.user!.id };

  const [bookmarks, total] = await Promise.all([
    LibraryBookmark.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "resourceId",
        select: HIDDEN_FIELDS,
        populate: { path: "uploaderId", select: "name picture" },
      })
      .lean(),
    LibraryBookmark.countDocuments(filter),
  ]);

  // Drop bookmarks whose resource was deleted or is no longer public.
  const resources = bookmarks
    .map((b: any) => b.resourceId)
    .filter((r: any) => r && r.status === "approved")
    .map((r: any) => ({ ...r, isBookmarked: true }));

  return res.status(200).json(paginated(resources, total, page, limit));
};

/* ── Single resource ───────────────────────────────────────────────── */

// GET /library/resources/:id
export const getResourceById = async (req: Request, res: Response) => {
  const resource: any = await LibraryResource.findById(req.params.id)
    .select(HIDDEN_FIELDS)
    .populate("uploaderId", "name picture")
    .lean();
  if (!resource) return res.status(404).json({ message: "Resource not found" });
  if (!canViewResource(resource, req))
    return res.status(404).json({ message: "Resource not found" });

  const owner = isOwner(resource, req);

  // Opening the details page counts as a view (not the uploader's own).
  if (!owner && resource.status === "approved") {
    await LibraryResource.updateOne({ _id: resource._id }, { $inc: { viewCount: 1 } });
    resource.viewCount += 1;
  }

  const bookmarked = await LibraryBookmark.exists({
    userId: req.user!.id,
    resourceId: resource._id,
  });

  return res.status(200).json({
    resource: {
      ...resource,
      isBookmarked: !!bookmarked,
      isOwner: owner,
      canDownload: resource.allowDownload || owner || isAdminUser(req),
    },
  });
};

// GET /library/resources/:id/preview
export const previewResource = async (req: Request, res: Response) => {
  const resource = await LibraryResource.findById(req.params.id);
  if (!resource || !canViewResource(resource, req))
    return res.status(404).json({ message: "Resource not found" });

  let previewMode: "pdf" | "image" | "text" | "office";
  let viewerUrl: string | undefined;

  switch (resource.fileType) {
    case "pdf":
      previewMode = "pdf";
      break;
    case "image":
      previewMode = "image";
      break;
    case "text":
      previewMode = "text";
      break;
    default:
      // Word / PowerPoint / Excel: render through Microsoft's public viewer.
      previewMode = "office";
      viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        resource.fileUrl
      )}`;
  }

  return res.status(200).json({
    previewMode,
    url: resource.fileUrl,
    viewerUrl,
    fileName: resource.fileName,
    fileType: resource.fileType,
    mimeType: resource.fileMimeType,
    pageCount: resource.pageCount,
  });
};

// GET /library/resources/:id/download
export const downloadResource = async (req: Request, res: Response) => {
  const resource = await LibraryResource.findById(req.params.id);
  if (!resource || !canViewResource(resource, req))
    return res.status(404).json({ message: "Resource not found" });

  if (!resource.allowDownload && !isOwner(resource, req) && !isAdminUser(req)) {
    return res
      .status(403)
      .json({ message: "The uploader has disabled downloads for this resource" });
  }

  if (resource.status === "approved") {
    await LibraryResource.updateOne({ _id: resource._id }, { $inc: { downloadCount: 1 } });
  }

  return res.status(200).json({
    downloadUrl: toDownloadUrl(resource.fileUrl, resource.fileName),
    fileName: resource.fileName,
  });
};

/* ── Upload / edit / delete ────────────────────────────────────────── */

// POST /library/resources  (multipart: file + fields)
export const createResource = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "A file is required" });

  const { buffer, mimetype, originalname, size } = req.file;
  const fileType = deriveFileType(mimetype);

  const [uploaded, pdfText] = await Promise.all([
    uploadLibraryFile(buffer, mimetype),
    fileType === "pdf"
      ? extractPdfText(buffer)
      : Promise.resolve({ text: "", pages: undefined as number | undefined }),
  ]);

  // Plain-text files are already readable — keep them for the AI features.
  const extractedText =
    fileType === "text" ? buffer.toString("utf8").slice(0, 60_000) : pdfText.text;

  const b = req.body;
  const autoApprove = isAdminUser(req);

  const resource = await LibraryResource.create({
    uploaderId: req.user!.id,
    title: b.title,
    description: b.description || undefined,
    category: b.category,
    courseCode: b.courseCode || undefined,
    subject: b.subject || undefined,
    department: b.department || undefined,
    level: b.level || undefined,
    session: b.session || undefined,
    tags: parseTags(b.tags),
    allowDownload: b.allowDownload === undefined ? true : String(b.allowDownload) === "true",

    fileUrl: uploaded.url,
    filePublicId: uploaded.publicId,
    fileName: originalname,
    fileSize: uploaded.bytes ?? size,
    fileType,
    fileMimeType: mimetype,
    cloudResourceType: uploaded.resourceType,
    pageCount: pdfText.pages ?? uploaded.pages,
    extractedText: extractedText || undefined,

    status: autoApprove ? "approved" : "pending",
    reviewedBy: autoApprove ? req.user!.id : undefined,
    reviewedAt: autoApprove ? new Date() : undefined,
  });

  await createNotification({
    userId: req.user!.id,
    title: autoApprove ? "Resource published" : "Resource submitted for review",
    message: autoApprove
      ? `"${resource.title}" is now live in the Library.`
      : `"${resource.title}" will appear in the Library once an admin approves it.`,
  });

  const safe = resource.toObject();
  delete (safe as any).extractedText;
  delete (safe as any).filePublicId;
  return res.status(201).json({
    message: autoApprove
      ? "Resource published"
      : "Resource submitted — it will appear once approved",
    resource: safe,
  });
};

// PUT /library/resources/:id  (owner or admin; metadata only)
export const updateResource = async (req: Request, res: Response) => {
  const resource = await LibraryResource.findById(req.params.id);
  if (!resource) return res.status(404).json({ message: "Resource not found" });
  if (!isOwner(resource, req) && !isAdminUser(req))
    return res.status(403).json({ message: "Forbidden: Not allowed" });

  const b = req.body;
  const textFields = [
    "title",
    "description",
    "category",
    "courseCode",
    "subject",
    "department",
    "level",
    "session",
  ] as const;
  for (const f of textFields) {
    if (b[f] !== undefined) (resource as any)[f] = b[f] === "" ? undefined : b[f];
  }
  if (b.tags !== undefined) resource.tags = parseTags(b.tags);
  if (b.allowDownload !== undefined)
    resource.allowDownload = String(b.allowDownload) === "true";

  await resource.save();

  const safe = resource.toObject();
  delete (safe as any).extractedText;
  delete (safe as any).filePublicId;
  delete (safe as any).fileUrl;
  return res.status(200).json({ message: "Resource updated", resource: safe });
};

// DELETE /library/resources/:id  (owner or admin)
export const deleteResource = async (req: Request, res: Response) => {
  const resource = await LibraryResource.findById(req.params.id);
  if (!resource) return res.status(404).json({ message: "Resource not found" });
  if (!isOwner(resource, req) && !isAdminUser(req))
    return res.status(403).json({ message: "Forbidden: Not allowed" });

  await deleteLibraryFile(resource.filePublicId, resource.cloudResourceType);
  await Promise.all([
    LibraryBookmark.deleteMany({ resourceId: resource._id }),
    LibraryReport.deleteMany({ resourceId: resource._id }),
    resource.deleteOne(),
  ]);

  return res.status(200).json({ message: "Resource deleted" });
};

/* ── Bookmarks ─────────────────────────────────────────────────────── */

// POST /library/resources/:id/bookmark  — toggles
export const toggleBookmark = async (req: Request, res: Response) => {
  const resource = await LibraryResource.findById(req.params.id).select(
    "status uploaderId bookmarkCount"
  );
  if (!resource || !canViewResource(resource, req))
    return res.status(404).json({ message: "Resource not found" });

  const userId = req.user!.id;
  const existing = await LibraryBookmark.findOneAndDelete({
    userId,
    resourceId: resource._id,
  });

  let bookmarked: boolean;
  if (existing) {
    bookmarked = false;
  } else {
    try {
      await LibraryBookmark.create({ userId, resourceId: resource._id });
      bookmarked = true;
    } catch (err: any) {
      // Two quick taps raced — the other request created it, so treat as saved.
      if (err?.code !== 11000) throw err;
      return res
        .status(200)
        .json({ bookmarked: true, bookmarkCount: resource.bookmarkCount });
    }
  }

  const updated = await LibraryResource.findOneAndUpdate(
    { _id: resource._id },
    [
      {
        $set: {
          bookmarkCount: { $max: [0, { $add: ["$bookmarkCount", bookmarked ? 1 : -1] }] },
        },
      },
    ],
    { new: true }
  ).select("bookmarkCount");

  return res
    .status(200)
    .json({ bookmarked, bookmarkCount: updated?.bookmarkCount ?? 0 });
};

/* ── Reports ───────────────────────────────────────────────────────── */

// POST /library/resources/:id/report
export const reportResource = async (req: Request, res: Response) => {
  const resource = await LibraryResource.findById(req.params.id).select(
    "status uploaderId title"
  );
  if (!resource || resource.status !== "approved")
    return res.status(404).json({ message: "Resource not found" });
  if (isOwner(resource, req))
    return res.status(400).json({ message: "You can't report your own resource" });

  try {
    await LibraryReport.create({
      resourceId: resource._id,
      reporterId: req.user!.id,
      reason: req.body.reason,
      details: req.body.details || undefined,
    });
  } catch (err: any) {
    if (err?.code === 11000)
      return res
        .status(409)
        .json({ message: "You've already reported this resource" });
    throw err;
  }

  const updated = await LibraryResource.findByIdAndUpdate(
    resource._id,
    { $inc: { openReportCount: 1 } },
    { new: true }
  ).select("openReportCount status");

  // Enough independent reports → hide it until an admin reviews it.
  if (
    updated &&
    updated.status === "approved" &&
    updated.openReportCount >= REPORT_FLAG_THRESHOLD
  ) {
    await LibraryResource.updateOne(
      { _id: resource._id, status: "approved" },
      { $set: { status: "flagged" } }
    );
  }

  return res
    .status(201)
    .json({ message: "Report submitted. Thanks for helping keep the Library accurate." });
};
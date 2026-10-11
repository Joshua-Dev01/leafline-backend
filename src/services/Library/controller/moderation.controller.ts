import { Request, Response } from "express";
import { LibraryResource, RESOURCE_STATUSES } from "../models/resource.model";
import { LibraryReport } from "../models/report.model";
import { createNotification } from "../../Notifications/services/notification.service";
import { escapeRegex } from "../utils/library.utils";
import { countAiReviewable, reviewPendingWithAi } from "../utils/aiReview";

const HIDDEN_FIELDS = "-fileUrl -filePublicId -extractedText";

const parsePagination = (query: Request["query"]) => {
  const page = Math.max(1, parseInt(String(query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(query.limit ?? "20"), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

// GET /library/admin/stats — numbers for the moderation badge/dashboard
export const getModerationStats = async (_req: Request, res: Response) => {
  const [pending, flagged, openReports, approved, rejected] = await Promise.all([
    LibraryResource.countDocuments({ status: "pending" }),
    LibraryResource.countDocuments({ status: "flagged" }),
    LibraryReport.countDocuments({ status: "open" }),
    LibraryResource.countDocuments({ status: "approved" }),
    LibraryResource.countDocuments({ status: "rejected" }),
  ]);
  return res.status(200).json({ pending, flagged, openReports, approved, rejected });
};

// GET /library/admin/resources?status=pending&q=
export const listResourcesForReview = async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const status = typeof req.query.status === "string" ? req.query.status : "pending";
  if (!(RESOURCE_STATUSES as readonly string[]).includes(status))
    return res.status(400).json({ message: "Invalid status" });

  const query: Record<string, any> = { status };
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const rx = { $regex: escapeRegex(req.query.q.trim()), $options: "i" };
    query.$or = [{ title: rx }, { courseCode: rx }, { subject: rx }];
  }

  const [resources, total] = await Promise.all([
    LibraryResource.find(query)
      .select(HIDDEN_FIELDS)
      .populate("uploaderId", "name email picture")
      .sort({ createdAt: 1 }) // oldest first — work the queue in order
      .skip(skip)
      .limit(limit)
      .lean(),
    LibraryResource.countDocuments(query),
  ]);

  return res.status(200).json({
    total,
    page,
    perPage: limit,
    totalPages: Math.ceil(total / limit),
    resources,
  });
};

// POST /library/admin/resources/:id/approve
export const approveResource = async (req: Request, res: Response) => {
  const resource = await LibraryResource.findById(req.params.id);
  if (!resource) return res.status(404).json({ message: "Resource not found" });
  if (resource.status === "approved")
    return res.status(200).json({ message: "Already approved" });

  const wasFlagged = resource.status === "flagged";

  resource.status = "approved";
  resource.rejectionReason = undefined;
  resource.reviewedBy = req.user!.id as any;
  resource.reviewedAt = new Date();

  // An admin who reviews a flagged resource and keeps it up has cleared its reports.
  if (wasFlagged) {
    await LibraryReport.updateMany(
      { resourceId: resource._id, status: "open" },
      {
        $set: {
          status: "dismissed",
          resolvedBy: req.user!.id,
          resolvedAt: new Date(),
          resolutionNote: "Resource reviewed and kept",
        },
      }
    );
    resource.openReportCount = 0;
  }
  await resource.save();

  if (!wasFlagged) {
    await createNotification({
      userId: resource.uploaderId.toString(),
      type: "library",
      actionUrl: "/dashboard/library",
      actionLabel: "Open library",
      meta: { resourceId: String(resource._id) },
      title: "Resource approved",
      message: `"${resource.title}" is now live in the Library.`,
    });
  }

  return res.status(200).json({ message: "Resource approved" });
};

// POST /library/admin/resources/:id/reject   { reason }
export const rejectResource = async (req: Request, res: Response) => {
  const resource = await LibraryResource.findById(req.params.id);
  if (!resource) return res.status(404).json({ message: "Resource not found" });

  resource.status = "rejected";
  resource.rejectionReason = req.body.reason;
  resource.reviewedBy = req.user!.id as any;
  resource.reviewedAt = new Date();
  await resource.save();

  await createNotification({
    userId: resource.uploaderId.toString(),
    type: "library",
    priority: "high",
    meta: { resourceId: String(resource._id) },
    title: "Resource not approved",
    message: `"${resource.title}" wasn't approved: ${req.body.reason}`,
  });

  return res.status(200).json({ message: "Resource rejected" });
};

// GET /library/admin/reports?status=open
export const listReports = async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const status = typeof req.query.status === "string" ? req.query.status : "open";
  if (!["open", "dismissed", "resolved"].includes(status))
    return res.status(400).json({ message: "Invalid status" });

  const [reports, total] = await Promise.all([
    LibraryReport.find({ status })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("reporterId", "name")
      .populate({
        path: "resourceId",
        select: "title courseCode category status openReportCount uploaderId",
        populate: { path: "uploaderId", select: "name" },
      })
      .lean(),
    LibraryReport.countDocuments({ status }),
  ]);

  return res.status(200).json({
    total,
    page,
    perPage: limit,
    totalPages: Math.ceil(total / limit),
    reports,
  });
};

// POST /library/admin/reports/:id/resolve   { action: "dismiss" | "remove", note? }
export const resolveReport = async (req: Request, res: Response) => {
  const report = await LibraryReport.findById(req.params.id);
  if (!report) return res.status(404).json({ message: "Report not found" });
  if (report.status !== "open")
    return res.status(409).json({ message: "This report has already been handled" });

  const resource = await LibraryResource.findById(report.resourceId);
  const { action, note } = req.body as { action: "dismiss" | "remove"; note?: string };
  const now = new Date();

  if (action === "dismiss") {
    report.status = "dismissed";
    report.resolvedBy = req.user!.id as any;
    report.resolvedAt = now;
    report.resolutionNote = note || undefined;
    await report.save();

    if (resource) {
      resource.openReportCount = Math.max(0, resource.openReportCount - 1);
      // Back under the threshold and nothing else open → make it public again.
      if (resource.status === "flagged" && resource.openReportCount === 0) {
        resource.status = "approved";
      }
      await resource.save();
    }
    return res.status(200).json({ message: "Report dismissed" });
  }

  // action === "remove": the report is valid — take the resource down and
  // close every open report against it.
  await LibraryReport.updateMany(
    { resourceId: report.resourceId, status: "open" },
    {
      $set: {
        status: "resolved",
        resolvedBy: req.user!.id,
        resolvedAt: now,
        resolutionNote: note || "Resource removed",
      },
    }
  );

  if (resource) {
    const reason = note || "Reported and removed by a moderator";
    resource.status = "rejected";
    resource.rejectionReason = reason;
    resource.reviewedBy = req.user!.id as any;
    resource.reviewedAt = now;
    resource.openReportCount = 0;
    await resource.save();

    await createNotification({
      userId: resource.uploaderId.toString(),
      type: "library",
      priority: "high",
      meta: { resourceId: String(resource._id) },
      title: "Resource removed",
      message: `"${resource.title}" was removed from the Library: ${reason}`,
    });
  }

  return res.status(200).json({ message: "Resource removed and reports resolved" });
};
// POST /library/admin/ai-review — have the AI work through the pending queue.
// Responds straight away; the review continues in the background.
export const runAiReview = async (_req: Request, res: Response) => {
  const queued = await countAiReviewable();
  if (queued === 0)
    return res.status(200).json({
      queued: 0,
      message:
        "Nothing for the AI to review — pending files without readable text need an admin.",
    });

  void reviewPendingWithAi(25).then((r) =>
    console.log(
      `[Library] AI review finished: ${r.approved} approved, ${r.rejected} rejected, ${r.skipped} left for admins`
    )
  );
  return res.status(202).json({
    queued: Math.min(queued, 25),
    message: `AI review started for ${Math.min(queued, 25)} resource${queued === 1 ? "" : "s"}. Results appear in a minute or two.`,
  });
};
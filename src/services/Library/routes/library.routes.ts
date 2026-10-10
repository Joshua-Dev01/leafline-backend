import express from "express";
import mongoose from "mongoose";
import catchAsync from "../../../utils/catchAsync";
import { protect } from "../../../MainAuth/middleware/protect";
import { checkRole } from "../../../admin/middleware/checkRole";
import { validate } from "../../Events/middleware/validate";
import { uploadLibraryFileField } from "../middleware/libraryUpload";
import {
  createResourceSchema,
  updateResourceSchema,
  reportResourceSchema,
  rejectResourceSchema,
  resolveReportSchema,
  askAiSchema,
  quizAiSchema,
} from "../validation/library.validation";
import {
  listResources,
  getPopularResources,
  getRecentResources,
  getCategories,
  getFilters,
  getMyResources,
  getBookmarkedResources,
  getResourceById,
  previewResource,
  downloadResource,
  createResource,
  updateResource,
  deleteResource,
  toggleBookmark,
  reportResource,
} from "../controller/resource.controller";
import { askAboutResource, generateResourceQuiz } from "../controller/ai.controller";
import {
  getModerationStats,
  listResourcesForReview,
  approveResource,
  rejectResource,
  listReports,
  resolveReport,
} from "../controller/moderation.controller";

const libraryRouter = express.Router();

// Everything in the Library requires a signed-in, verified user.
libraryRouter.use(catchAsync(protect));

// Reject malformed ids with a 400 instead of a Mongoose CastError (500).
libraryRouter.param("id", (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ message: "Invalid id" });
  next();
});

/* ── Browse ─────────────────────────────────────────────────────── */
libraryRouter.get("/categories", catchAsync(getCategories));
libraryRouter.get("/filters", catchAsync(getFilters));

libraryRouter.get("/resources", catchAsync(listResources));
// Static paths must come before "/resources/:id".
libraryRouter.get("/resources/popular", catchAsync(getPopularResources));
libraryRouter.get("/resources/recent", catchAsync(getRecentResources));
libraryRouter.get("/resources/mine", catchAsync(getMyResources));
libraryRouter.get("/resources/bookmarks", catchAsync(getBookmarkedResources));

/* ── Upload / share ─────────────────────────────────────────────── */
libraryRouter.post(
  "/resources",
  uploadLibraryFileField,
  catchAsync(validate(createResourceSchema)),
  catchAsync(createResource)
);

/* ── Single resource ────────────────────────────────────────────── */
libraryRouter.get("/resources/:id", catchAsync(getResourceById));
libraryRouter.put(
  "/resources/:id",
  catchAsync(validate(updateResourceSchema)),
  catchAsync(updateResource)
);
libraryRouter.delete("/resources/:id", catchAsync(deleteResource));

libraryRouter.get("/resources/:id/preview", catchAsync(previewResource));
libraryRouter.get("/resources/:id/download", catchAsync(downloadResource));

libraryRouter.post("/resources/:id/bookmark", catchAsync(toggleBookmark));
libraryRouter.post(
  "/resources/:id/report",
  catchAsync(validate(reportResourceSchema)),
  catchAsync(reportResource)
);

/* ── AI ─────────────────────────────────────────────────────────── */
libraryRouter.post(
  "/resources/:id/ai/ask",
  catchAsync(validate(askAiSchema)),
  catchAsync(askAboutResource)
);
libraryRouter.post(
  "/resources/:id/ai/quiz",
  catchAsync(validate(quizAiSchema)),
  catchAsync(generateResourceQuiz)
);

/* ── Admin moderation ───────────────────────────────────────────── */
const adminOnly = [catchAsync(checkRole(["admin", "superadmin"]))];

libraryRouter.get("/admin/stats", ...adminOnly, catchAsync(getModerationStats));
libraryRouter.get("/admin/resources", ...adminOnly, catchAsync(listResourcesForReview));
libraryRouter.post("/admin/resources/:id/approve", ...adminOnly, catchAsync(approveResource));
libraryRouter.post(
  "/admin/resources/:id/reject",
  ...adminOnly,
  catchAsync(validate(rejectResourceSchema)),
  catchAsync(rejectResource)
);
libraryRouter.get("/admin/reports", ...adminOnly, catchAsync(listReports));
libraryRouter.post(
  "/admin/reports/:id/resolve",
  ...adminOnly,
  catchAsync(validate(resolveReportSchema)),
  catchAsync(resolveReport)
);

export default libraryRouter;
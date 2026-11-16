import express from "express";
import multer from "multer";
import { protect } from "../../../MainAuth/middleware/protect";
import catchAsync from "../../../utils/catchAsync";
import { AppError } from "../../../utils/AppError";
import { validate, validateObjectId } from "../middleware/validate";
import { optionalAuth } from "../middleware/optionalAuth";

import {
  createEvent,
  getAllEvents,
  getEvent,
  getMyEvents,
  getGoingEvents,
  updateEvent,
  deleteEvent,
  getShareLink,
  downloadCalendarFile,
} from "../controller/event.controller";
import { toggleInterest, toggleGoing } from "../controller/rsvp.controller";
import {
  cancelEvent,
  reinstateEvent,
  listHosts,
  addCoHost,
  removeCoHost,
  getAttendees,
  exportAttendeesCsv,
} from "../controller/host.controller";
import {
  createUpdate,
  getUpdates,
  editUpdate,
  deleteUpdate,
} from "../controller/eventUpdates.controller";
import {
  followOrganizer,
  unfollowOrganizer,
  getOrganizer,
  getFollowingOrganizers,
  getFollowingFeed,
} from "../controller/follow.controller";
import {
  addComment,
  getComments,
  getReplies,
  updateComment,
  deleteComment,
  toggleLike,
} from "../controller/Comment.controller";
import {
  addCoHostSchema,
  attendeesQuerySchema,
  cancelEventSchema,
  createCommentSchema,
  createEventSchema,
  createUpdateSchema,
  editUpdateSchema,
  listEventsQuerySchema,
  pageQuerySchema,
  updateCommentSchema,
  updateEventSchema,
} from "../validators/event.validation";

const router = express.Router();

// Event cover images: images only, max 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new AppError("Only image files are allowed", 400)),
});

const auth = catchAsync(protect);
const maybeAuth = catchAsync(optionalAuth);

/* ── Event CRUD ─────────────────────────────────────────────────── */
router.post(
  "/",
  auth,
  upload.single("image"),
  validate(createEventSchema),
  catchAsync(createEvent),
);

router.get(
  "/",
  maybeAuth,
  validate(listEventsQuerySchema, "query"),
  catchAsync(getAllEvents),
); // public

/* ── Static paths MUST come before "/:id" ───────────────────────── */
router.get("/mine", auth, catchAsync(getMyEvents));
router.get("/going", auth, catchAsync(getGoingEvents));

/* ── Organizers ─────────────────────────────────────────────────── */
router.get("/following", auth, validate(pageQuerySchema, "query"), catchAsync(getFollowingFeed));
router.get("/following/organizers", auth, catchAsync(getFollowingOrganizers));
router.get("/organizers/:userId", validateObjectId("userId"), maybeAuth, catchAsync(getOrganizer));
router.post("/organizers/:userId/follow", validateObjectId("userId"), auth, catchAsync(followOrganizer));
router.delete("/organizers/:userId/follow", validateObjectId("userId"), auth, catchAsync(unfollowOrganizer));

/* ── Single event ───────────────────────────────────────────────── */
router.get("/:id/share", validateObjectId("id"), catchAsync(getShareLink)); // public
router.get("/:id/calendar", validateObjectId("id"), catchAsync(downloadCalendarFile)); // public .ics
router.get("/:id", validateObjectId("id"), maybeAuth, catchAsync(getEvent)); // public

router.patch(
  "/:id",
  validateObjectId("id"),
  auth,
  upload.single("image"),
  validate(updateEventSchema),
  catchAsync(updateEvent),
);

router.delete("/:id", validateObjectId("id"), auth, catchAsync(deleteEvent));

/* ── Interactions ───────────────────────────────────────────────── */
router.post("/:id/interest", validateObjectId("id"), auth, catchAsync(toggleInterest));
router.post("/:id/going", validateObjectId("id"), auth, catchAsync(toggleGoing));

/* ── Host tools ─────────────────────────────────────────────────── */
router.post(
  "/:id/cancel",
  validateObjectId("id"),
  auth,
  validate(cancelEventSchema),
  catchAsync(cancelEvent),
);
router.post("/:id/reinstate", validateObjectId("id"), auth, catchAsync(reinstateEvent));

router.get("/:id/hosts", validateObjectId("id"), catchAsync(listHosts)); // public
router.post(
  "/:id/cohosts",
  validateObjectId("id"),
  auth,
  validate(addCoHostSchema),
  catchAsync(addCoHost),
);
router.delete(
  "/:id/cohosts/:userId",
  validateObjectId("id", "userId"),
  auth,
  catchAsync(removeCoHost),
);

router.get(
  "/:id/attendees",
  validateObjectId("id"),
  auth,
  validate(attendeesQuerySchema, "query"),
  catchAsync(getAttendees),
);
router.get(
  "/:id/attendees.csv",
  validateObjectId("id"),
  auth,
  catchAsync(exportAttendeesCsv),
);

/* ── Updates feed ───────────────────────────────────────────────── */
router.get(
  "/:id/updates",
  validateObjectId("id"),
  validate(pageQuerySchema, "query"),
  catchAsync(getUpdates),
); // public
router.post(
  "/:id/updates",
  validateObjectId("id"),
  auth,
  validate(createUpdateSchema),
  catchAsync(createUpdate),
);
router.patch(
  "/:id/updates/:updateId",
  validateObjectId("id", "updateId"),
  auth,
  validate(editUpdateSchema),
  catchAsync(editUpdate),
);
router.delete(
  "/:id/updates/:updateId",
  validateObjectId("id", "updateId"),
  auth,
  catchAsync(deleteUpdate),
);

/* ── Comments ───────────────────────────────────────────────────── */
router.post(
  "/:id/comments",
  validateObjectId("id"),
  auth,
  validate(createCommentSchema),
  catchAsync(addComment),
);

router.get("/:id/comments", validateObjectId("id"), catchAsync(getComments)); // public
router.get(
  "/:id/comments/:commentId/replies",
  validateObjectId("id", "commentId"),
  catchAsync(getReplies),
); // public

router.patch(
  "/:id/comments/:commentId",
  validateObjectId("id", "commentId"),
  auth,
  validate(updateCommentSchema),
  catchAsync(updateComment),
);

router.delete(
  "/:id/comments/:commentId",
  validateObjectId("id", "commentId"),
  auth,
  catchAsync(deleteComment),
);
router.post(
  "/:id/comments/:commentId/like",
  validateObjectId("id", "commentId"),
  auth,
  catchAsync(toggleLike),
);

export default router;

import express from "express";
import multer from "multer";
import { protect } from "../../../MainAuth/middleware/protect";
import catchAsync from "../../../utils/catchAsync";
import { validate } from "../middleware/validate";



import {
  createEvent,
  getAllEvents,
  getEvent,
  getMyEvents,
  getGoingEvents,
  updateEvent,
  deleteEvent,
  toggleInterest,
  toggleGoing,
  getShareLink,
} from "../controller/event.controller";

import {
  addComment,
  getComments,
  getReplies,
  updateComment,
  deleteComment,
  toggleLike,
} from "../controller/Comment.controller";
import { createCommentSchema, createEventSchema, updateCommentSchema, updateEventSchema } from "../validators/event.validation";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ── Event CRUD ─────────────────────────────────────────────────── */
router.post(
  "/",
  catchAsync(protect),
  upload.single("image"),
  catchAsync(validate(createEventSchema)),
  catchAsync(createEvent),
);

router.get("/", catchAsync(getAllEvents)); // public
router.get("/mine", catchAsync(protect), catchAsync(getMyEvents));
router.get("/going", catchAsync(protect), catchAsync(getGoingEvents));
router.get("/:id/share", catchAsync(getShareLink)); // public
router.get("/:id", catchAsync(getEvent)); // public

router.patch(
  "/:id",
  catchAsync(protect),
  upload.single("image"),
  catchAsync(validate(updateEventSchema)),
  catchAsync(updateEvent),
);

router.delete("/:id", catchAsync(protect), catchAsync(deleteEvent));

/* ── Interactions ───────────────────────────────────────────────── */
router.post("/:id/interest", catchAsync(protect), catchAsync(toggleInterest));
router.post("/:id/going", catchAsync(protect), catchAsync(toggleGoing));

/* ── Comments ───────────────────────────────────────────────────── */
router.post(
  "/:id/comments",
  catchAsync(protect),
  catchAsync(validate(createCommentSchema)),
  catchAsync(addComment),
);

router.get("/:id/comments", catchAsync(getComments)); // public
router.get("/:id/comments/:commentId/replies", catchAsync(getReplies)); // public

router.patch(
  "/:id/comments/:commentId",
  catchAsync(protect),
  catchAsync(validate(updateCommentSchema)),
  catchAsync(updateComment),
);

router.delete(
  "/:id/comments/:commentId",
  catchAsync(protect),
  catchAsync(deleteComment),
);
router.post(
  "/:id/comments/:commentId/like",
  catchAsync(protect),
  catchAsync(toggleLike),
);

export default router;

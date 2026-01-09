import express from "express";
import { protect } from "../../../MainAuth/middleware/protect";
import { createEvent, deleteEvent, getAllEvents, getMyEvents, toggleGoing, toggleInterest } from "../controller/event.controller";
import catchAsync from "../../../utils/catchAsync";
import { createEventValidator } from "../validators/event.validation";
import { upload } from "../../../MainAuth/middleware/upload";
import { validate } from "../middleware/validate";

const EventRouter = express.Router();

// ✅ Create event w/ optional image upload
EventRouter.post(
    "/create-event",
    catchAsync(protect),
    upload.single("image"), // optional image
    catchAsync(validate(createEventValidator)),
    catchAsync(createEvent)
);

// ✅ Event list + search + pagination + sorting
EventRouter.get("/", catchAsync(protect), getAllEvents);

// ✅ Events user created
EventRouter.get("/mine", catchAsync(protect), catchAsync(getMyEvents));

// ✅ Interactions
EventRouter.post("/:id/interested", catchAsync(protect), catchAsync(toggleInterest));
EventRouter.post("/:id/going", catchAsync(protect), catchAsync(toggleGoing));

// ✅ Delete by creator only
EventRouter.delete("/:id", catchAsync(protect), catchAsync(deleteEvent));

export default EventRouter;

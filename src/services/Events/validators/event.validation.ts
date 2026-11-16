import Joi from "joi";
import { EVENT_CATEGORIES, EVENT_MODES } from "../model/events.model";

const objectId = () => Joi.string().hex().length(24);

const URL_MESSAGES = {
  "string.uri": "Link must be a valid http(s) URL",
  "string.uriCustomScheme": "Link must be a valid http(s) URL",
};

/** "" is treated as "not provided" (multipart forms send empty strings). */
const optionalText = (max: number) =>
  Joi.string().trim().max(max).empty("");
const optionalUrl = () =>
  Joi.string()
    .trim()
    .uri({ scheme: ["http", "https"] })
    .max(500)
    .empty("")
    .messages(URL_MESSAGES);

/* ── Create Event ───────────────────────────────────────────────────── */
export const createEventSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120).required(),
  description: Joi.string().trim().min(10).max(2000).required(),
  category: Joi.string()
    .valid(...EVENT_CATEGORIES)
    .required(),
  mode: Joi.string()
    .valid(...EVENT_MODES)
    .default("physical"),
  startTime: Joi.date()
    .iso()
    .min("now")
    .required()
    .messages({ "date.min": "Start time must be in the future" }),
  endTime: Joi.date()
    .iso()
    .greater(Joi.ref("startTime"))
    .empty("")
    .messages({ "date.greater": "End time must be after the start time" }),
  // physical + hybrid need a place, online + hybrid need a link
  location: optionalText(200)
    .when("mode", { is: Joi.valid("physical", "hybrid"), then: Joi.required() })
    .messages({ "any.required": "Location is required for in-person events" }),
  onlineLink: optionalUrl()
    .when("mode", { is: Joi.valid("online", "hybrid"), then: Joi.required() })
    .messages({ "any.required": "A meeting link is required for online events" }),
  capacity: Joi.number().integer().min(1).max(100000).empty(""),
});

/* ── Update Event ───────────────────────────────────────────────────── */
// "" (or null) on a clearable field means "remove it".
// Cross-field rules (mode vs location, end vs start, capacity vs attendees)
// need the stored event, so the controller enforces those.
export const updateEventSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120),
  description: Joi.string().trim().min(10).max(2000),
  category: Joi.string().valid(...EVENT_CATEGORIES),
  mode: Joi.string().valid(...EVENT_MODES),
  startTime: Joi.date().iso(),
  endTime: Joi.alternatives(Joi.date().iso(), Joi.valid("", null)),
  location: Joi.string().trim().max(200).allow("", null),
  onlineLink: Joi.alternatives(
    Joi.string()
      .trim()
      .uri({ scheme: ["http", "https"] })
      .max(500),
    Joi.valid("", null),
  ).messages({
    ...URL_MESSAGES,
    "alternatives.match": "Link must be a valid http(s) URL",
  }),
  capacity: Joi.alternatives(
    Joi.number().integer().min(1).max(100000),
    Joi.valid("", null),
  ),
  removeImage: Joi.boolean(),
});

/* ── List events (query string) ─────────────────────────────────────── */
const csvOf = (allowed: readonly string[]) =>
  Joi.string()
    .empty("")
    .custom((value: string, helpers) => {
      const items = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return items.every((i) => allowed.includes(i))
        ? items
        : helpers.error("any.invalid");
    });

export const LIST_STATUSES = [
  "upcoming",
  "live",
  "ended",
  "active", // upcoming + live
  "cancelled",
] as const;

export const listEventsQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).empty(""),
  category: csvOf(EVENT_CATEGORIES),
  mode: csvOf(EVENT_MODES),
  status: Joi.string()
    .valid(...LIST_STATUSES)
    .empty(""),
  creator: objectId().empty(""),
  from: Joi.date().iso().empty(""),
  to: Joi.date().iso().empty("").min(Joi.ref("from")),
  includeCancelled: Joi.boolean().default(false),
  sort: Joi.string()
    .valid("date", "latest", "popular", "relevance")
    .default("date"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(12),
}).unknown(true); // ignore extra params the client may add

/* ── Cancel / hosts / attendees / updates ───────────────────────────── */
export const cancelEventSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow("").default(""),
});

export const addCoHostSchema = Joi.object({
  userId: objectId(),
  email: Joi.string().trim().lowercase().email(),
}).or("userId", "email");

export const attendeesQuerySchema = Joi.object({
  status: Joi.string().valid("going", "interested", "waitlist").default("going"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
}).unknown(true);

export const createUpdateSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required(),
  pinned: Joi.boolean().default(false),
  notify: Joi.boolean().default(true), // push a notification to attendees
});

export const editUpdateSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000),
  pinned: Joi.boolean(),
}).min(1);

export const pageQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
}).unknown(true);

/* ── Comment ────────────────────────────────────────────────────────── */
export const createCommentSchema = Joi.object({
  text: Joi.string().min(1).max(1000).required(),
  parentId: Joi.string().hex().length(24).optional(),
});

export const updateCommentSchema = Joi.object({
  text: Joi.string().min(1).max(1000).required(),
});

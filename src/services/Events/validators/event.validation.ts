import Joi from "joi";

/* ── Create Event ───────────────────────────────────────────────────── */
export const createEventSchema = Joi.object({
  title:       Joi.string().min(3).max(120).required(),
  description: Joi.string().min(10).max(2000).required(),
  category:    Joi.string()
    .valid("Academic", "Campus Life", "Career", "Competition", "Social", "Cultural", "Sports", "Other")
    .required(),
  mode:        Joi.string().valid("physical", "online", "hybrid").default("physical"),
  startTime:   Joi.date().iso().required(),
  endTime:     Joi.date().iso().min(Joi.ref("startTime")).optional(),
  location:    Joi.string().max(200).optional().allow(""),
  onlineLink:  Joi.string().uri().optional().allow(""),
  capacity:    Joi.number().integer().min(1).optional(),
}).or("location", "onlineLink"); // at least one must be provided

/* ── Update Event ───────────────────────────────────────────────────── */
export const updateEventSchema = Joi.object({
  title:       Joi.string().min(3).max(120),
  description: Joi.string().min(10).max(2000),
  category:    Joi.string()
    .valid("Academic", "Campus Life", "Career", "Competition", "Social", "Cultural", "Sports", "Other"),
  mode:        Joi.string().valid("physical", "online", "hybrid"),
  startTime:   Joi.date().iso(),
  endTime:     Joi.date().iso().optional(),
  location:    Joi.string().max(200).optional().allow(""),
  onlineLink:  Joi.string().uri().optional().allow(""),
  capacity:    Joi.number().integer().min(1).optional(),
}).min(1); // at least one field required

/* ── Comment ────────────────────────────────────────────────────────── */
export const createCommentSchema = Joi.object({
  text:     Joi.string().min(1).max(1000).required(),
  parentId: Joi.string().hex().length(24).optional(),
});

export const updateCommentSchema = Joi.object({
  text: Joi.string().min(1).max(1000).required(),
});
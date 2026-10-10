import Joi from "joi";
import { RESOURCE_CATEGORIES } from "../models/resource.model";
import { REPORT_REASONS } from "../models/report.model";

// Upload bodies arrive as multipart/form-data, so every value is a string.
// `tags` may be a JSON array string or a comma-separated string — the
// controller normalises it, so here it just has to be a string.
export const createResourceSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().trim().max(2000).allow(""),
  category: Joi.string()
    .valid(...RESOURCE_CATEGORIES)
    .required(),
  courseCode: Joi.string().trim().max(20).allow(""),
  subject: Joi.string().trim().max(100).allow(""),
  department: Joi.string().trim().max(100).allow(""),
  level: Joi.string().trim().max(20).allow(""),
  session: Joi.string().trim().max(20).allow(""),
  tags: Joi.string().allow(""),
  allowDownload: Joi.boolean().truthy("true").falsy("false"),
});

export const updateResourceSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150),
  description: Joi.string().trim().max(2000).allow(""),
  category: Joi.string().valid(...RESOURCE_CATEGORIES),
  courseCode: Joi.string().trim().max(20).allow(""),
  subject: Joi.string().trim().max(100).allow(""),
  department: Joi.string().trim().max(100).allow(""),
  level: Joi.string().trim().max(20).allow(""),
  session: Joi.string().trim().max(20).allow(""),
  tags: Joi.alternatives().try(Joi.string().allow(""), Joi.array().items(Joi.string().trim())),
  allowDownload: Joi.boolean().truthy("true").falsy("false"),
}).min(1);

export const reportResourceSchema = Joi.object({
  reason: Joi.string()
    .valid(...REPORT_REASONS)
    .required(),
  details: Joi.string().trim().max(1000).allow(""),
});

export const rejectResourceSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required(),
});

export const resolveReportSchema = Joi.object({
  // dismiss: report is wrong, keep the resource
  // remove:  report is valid, take the resource down
  action: Joi.string().valid("dismiss", "remove").required(),
  note: Joi.string().trim().max(500).allow(""),
});

export const askAiSchema = Joi.object({
  question: Joi.string().trim().min(3).max(1000).required(),
});

export const quizAiSchema = Joi.object({
  count: Joi.number().integer().min(3).max(15).default(5),
});
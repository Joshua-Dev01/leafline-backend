import Joi from "joi";
import {
  PROJECT_CATEGORIES,
  PROJECT_COLORS,
  PROJECT_ICONS,
  PROJECT_VISIBILITIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../utils/project.constants";

const objectId = Joi.string().hex().length(24);
const optionalDate = Joi.date().iso().allow(null);

const checkDates = (v: any, helpers: Joi.CustomHelpers) =>
  v.startDate && v.deadline && new Date(v.deadline) < new Date(v.startDate)
    ? helpers.message({ custom: "The deadline can't be before the start date" })
    : v;

const projectFields = {
  title: Joi.string().trim().min(3).max(100),
  description: Joi.string().trim().max(2000).allow(""),
  category: Joi.string().valid(...PROJECT_CATEGORIES),
  startDate: optionalDate,
  deadline: optionalDate,
  visibility: Joi.string().valid(...PROJECT_VISIBILITIES),
  color: Joi.string().valid(...PROJECT_COLORS),
  icon: Joi.string().valid(...PROJECT_ICONS),
};

export const createProjectSchema = Joi.object({
  ...projectFields,
  title: projectFields.title.required(),
}).custom(checkDates);

export const updateProjectSchema = Joi.object(projectFields).min(1).custom(checkDates);

export const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(2000).allow(""),
  assignedTo: objectId.allow(null),
  dueDate: optionalDate,
  priority: Joi.string().valid(...TASK_PRIORITIES),
  status: Joi.string().valid(...TASK_STATUSES),
  subtasks: Joi.array().items(Joi.string().trim().min(1).max(200)).max(30),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200),
  description: Joi.string().trim().max(2000).allow(""),
  assignedTo: objectId.allow(null),
  dueDate: optionalDate,
  priority: Joi.string().valid(...TASK_PRIORITIES),
  status: Joi.string().valid(...TASK_STATUSES),
}).min(1);

export const createSubtaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
});

export const updateSubtaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200),
  done: Joi.boolean(),
}).min(1);

export const commentSchema = Joi.object({
  body: Joi.string().trim().min(1).max(2000).required(),
});

export const inviteSchema = Joi.object({
  userId: objectId,
  email: Joi.string().trim().email(),
})
  .xor("userId", "email")
  .messages({ "object.missing": "Choose a person to invite", "object.xor": "Choose a person to invite" });

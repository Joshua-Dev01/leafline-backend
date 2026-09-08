import Joi from "joi";

export const createCommentValidator = Joi.object({
  text:     Joi.string().min(1).max(1000).required(),
  parentId: Joi.string().optional(), // optional: reply to a comment
});

export const updateCommentValidator = Joi.object({
  text: Joi.string().min(1).max(1000).required(),
});
import Joi from "joi";

export const subjectValidation = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  progress: Joi.number().min(0).max(100).default(0),
});

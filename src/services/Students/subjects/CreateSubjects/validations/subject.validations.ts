import Joi from "joi";

export const subjectValidation = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  progress: Joi.number().min(0).max(100).default(0),
  unit: Joi.number().min(1).required(),
  code: Joi.string().min(2).max(20).required(),
});

export const subjectUpdateValidation = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  unit: Joi.number().min(1).optional(),
  code: Joi.string().min(3).max(10).optional(),
});

import Joi from "joi";

export const noteValidation = Joi.object({
    title: Joi.string().min(2).max(100).required(),
    content: Joi.string().min(5).required(),
    subjectId: Joi.string().required(),
    tags: Joi.array().items(Joi.string().trim()),
});

export const noteUpdateValidation = Joi.object({
    title: Joi.string().min(2).max(100),
    content: Joi.string().min(5),
    tags: Joi.array().items(Joi.string().trim()),
});

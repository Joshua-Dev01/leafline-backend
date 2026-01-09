import Joi from "joi";

export const createEventValidator = Joi.object({
    title: Joi.string().min(3).required(),
    description: Joi.string().min(10).required(),
    topic: Joi.string().optional(),
    image: Joi.string().optional(),
    date: Joi.date().required(),
    location: Joi.string().optional(),
});

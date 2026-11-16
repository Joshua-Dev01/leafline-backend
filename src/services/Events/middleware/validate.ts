import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";

type Source = "body" | "query";

/**
 * Validate req.body (default) or req.query with a Joi schema.
 * - body:  the converted/defaulted value replaces req.body
 * - query: Express 5 makes req.query read-only, so the converted value is
 *          placed on res.locals.query instead
 */
export const validate =
  (schema: ObjectSchema, source: Source = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const input = source === "body" ? req.body : req.query;
    const { error, value } = schema.validate(input ?? {}, { convert: true });

    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    if (source === "body") req.body = value;
    else res.locals.query = value;

    next();
  };

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** 400 early when a route param isn't a valid ObjectId (instead of a 500 CastError). */
export const validateObjectId =
  (...params: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    for (const p of params) {
      if (!OBJECT_ID.test(String(req.params[p] ?? ""))) {
        res.status(400).json({ message: `Invalid ${p}` });
        return;
      }
    }
    next();
  };

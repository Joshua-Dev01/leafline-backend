import { Request, Response, NextFunction } from "express";

export const checkSubjectOwnership = (req: Request, res: Response, next: NextFunction) => {
  // placeholder: real ownership check handled in controller queries
  next();
};

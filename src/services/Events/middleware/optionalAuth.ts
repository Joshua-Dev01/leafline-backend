import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { LeafLineUser } from "../../../MainAuth/signup/model/user.model";

/**
 * Like `protect`, but never rejects. If a valid token is sent, req.user is
 * set so public endpoints can personalise the response (e.g. "am I going?").
 * Missing/invalid tokens simply leave req.user undefined.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ") && process.env.JWT_SECRET) {
      const decoded = jwt.verify(
        header.split(" ")[1],
        process.env.JWT_SECRET,
      ) as { id?: string };

      if (decoded?.id) {
        const user = await LeafLineUser.findById(decoded.id).select(
          "-password",
        );
        if (user && user.isVerified) {
          req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
            accountType: user.accountType,
            picture: user.picture || "",
            role: user.role,
            bio: user.bio,
          } as any;
        }
      }
    }
  } catch {
    /* ignore: treated as anonymous */
  }
  next();
};

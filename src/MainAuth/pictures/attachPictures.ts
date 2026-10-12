// src/MainAuth/pictures/attachPictures.ts
//
// A user's `picture` field only holds the id of a ProfilePicture document; the
// real image URL lives in that document. This middleware fills in the URL for
// every "person" object ({ _id, name, picture }) in a JSON response, so the
// frontend can show profile pictures for teammates, uploaders, commenters, etc.
//
// It only touches plain objects, never throws, and falls back to sending the
// response unchanged if anything goes wrong.
import { NextFunction, Request, Response } from "express";
import { ProfilePicture } from "./model/profilePicture.model";

const MAX_DEPTH = 10;

const isPlain = (v: any) => {
  if (v === null || typeof v !== "object") return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/** { _id, name, picture } — a user shown inside some other response. */
const isPerson = (o: any) =>
  isPlain(o) && o._id != null && typeof o.name === "string" && "picture" in o;

const walk = (node: any, visit: (person: any) => void, depth = 0) => {
  if (depth > MAX_DEPTH || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, visit, depth + 1));
    return;
  }
  if (!isPlain(node)) return; // ObjectIds, Dates, mongoose documents…
  if (isPerson(node)) visit(node);
  Object.values(node).forEach((v) => walk(v, visit, depth + 1));
};

export const resolvePictures = async (body: any) => {
  const ids = new Set<string>();
  walk(body, (p) => ids.add(String(p._id)));
  if (ids.size === 0) return;

  const rows = await ProfilePicture.find({ userId: { $in: [...ids] } })
    .select("userId url")
    .lean();
  const urls = new Map(rows.map((r: any) => [String(r.userId), r.url as string]));

  walk(body, (p) => {
    p.picture = urls.get(String(p._id)) ?? null;
  });
};

export const attachPictures = (_req: Request, res: Response, next: NextFunction) => {
  const original = res.json.bind(res);
  res.json = ((body: any) => {
    resolvePictures(body)
      .catch((err) => console.warn("[pictures] could not attach profile pictures:", err))
      .finally(() => original(body));
    return res;
  }) as Response["json"];
  next();
};
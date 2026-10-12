import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { LeafLineUser } from "../../../MainAuth/signup/model/user.model";
import { Plan } from "../../pricing/model/pricing.model";
import { createNotification } from "../../Notifications/services/notification.service";
import { IProject, Project } from "../model/projects.model";
import { ProjectActivity, ProjectTask } from "../model/projectExtras.model";
import { FREE_PROJECT_LIMIT } from "./project.constants";

/* ── Access control ─────────────────────────────────────────────── */
export interface ProjectAccess {
  project: IProject;
  userId: string;
  isOwner: boolean;
  role: "owner" | "member";
}

declare global {
  namespace Express {
    interface Request {
      access?: ProjectAccess;
    }
  }
}

/**
 * Loads :projectId and checks the signed-in user may touch it.
 * Non-members get a 404 (not 403) so private projects can't be discovered.
 *  - ownerOnly: only the owner
 *  - write: blocks changes to archived projects (they're read-only)
 */
export const requireProjectAccess =
  (opts: { ownerOnly?: boolean; write?: boolean } = {}) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const project = await Project.findById(req.params.projectId);
    const userId = req.user!.id;
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isOwner = project.createdBy.toString() === userId;
    const isMember = project.collaborators.some((c) => c.toString() === userId);
    if (!isOwner && !isMember) return res.status(404).json({ message: "Project not found" });

    if (opts.ownerOnly && !isOwner)
      return res.status(403).json({ message: "Only the project owner can do this" });
    if (opts.write && project.archived)
      return res
        .status(409)
        .json({ message: "This project is archived. Restore it to make changes." });

    req.access = { project, userId, isOwner, role: isOwner ? "owner" : "member" };
    next();
  };

/** Router-param guard so malformed ids return 400 instead of a cast error. */
export const validateObjectIdParam = (
  req: Request,
  res: Response,
  next: NextFunction,
  value: string
) => {
  if (!mongoose.isValidObjectId(value)) return res.status(400).json({ message: "Invalid id" });
  next();
};

export const isProjectMember = (project: IProject, userId: string) =>
  project.createdBy.toString() === userId ||
  project.collaborators.some((c) => c.toString() === userId);

/* ── Free-plan limit ────────────────────────────────────────────── */
/**
 * Max ACTIVE projects a user may own. Uses the user's real subscription
 * (set by the Paystack flow) and that plan's `projectsLimit`; otherwise the
 * free limit. A plan limit of 0 or less means unlimited. Admins are unlimited.
 * Archived projects don't count.
 */
export const getProjectLimit = async (userId: string, role?: string) => {
  if (role === "admin" || role === "superadmin") return { max: null as number | null, plan: "Admin" };

  const user = await LeafLineUser.findById(userId).select("subscription");
  const sub = user?.subscription;
  if (sub?.active && sub.expiryDate && sub.expiryDate > new Date()) {
    const plan: any = await Plan.findById(sub.plan);
    if (plan) return { max: plan.projectsLimit > 0 ? (plan.projectsLimit as number) : null, plan: plan.name as string };
  }
  return { max: FREE_PROJECT_LIMIT as number | null, plan: "Free" };
};

export const countActiveOwned = (userId: string) =>
  Project.countDocuments({ createdBy: userId, archived: { $ne: true } });

export const limitMessage = (max: number, plan: string) =>
  `You've reached the ${plan} plan limit of ${max} active projects. Archive or delete a project, or upgrade your plan to create more.`;

/* ── Progress (always computed from tasks) ──────────────────────── */
export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  percent: number;
}

export const emptyStats = (): TaskStats => ({
  total: 0,
  completed: 0,
  inProgress: 0,
  notStarted: 0,
  overdue: 0,
  percent: 0,
});

export const getTaskStats = async (projectIds: any[]) => {
  const map = new Map<string, TaskStats>();
  if (!projectIds.length) return map;
  const now = new Date();
  const rows = await ProjectTask.aggregate([
    { $match: { projectId: { $in: projectIds.map((id) => new mongoose.Types.ObjectId(String(id))) } } },
    {
      $group: {
        _id: "$projectId",
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", "completed"] },
                  { $eq: [{ $type: "$dueDate" }, "date"] },
                  { $lt: ["$dueDate", now] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  rows.forEach((r) =>
    map.set(String(r._id), {
      total: r.total,
      completed: r.completed,
      inProgress: r.inProgress,
      notStarted: r.total - r.completed - r.inProgress,
      overdue: r.overdue,
      percent: r.total ? Math.round((r.completed / r.total) * 100) : 0,
    })
  );
  return map;
};

/** not-started → in-progress → completed, derived from the tasks. */
export const deriveStatus = (s: TaskStats) => {
  if (s.total === 0) return "not-started";
  if (s.completed === s.total) return "completed";
  if (s.completed > 0 || s.inProgress > 0) return "in-progress";
  return "not-started";
};

/* ── Serialisation (only safe, public user fields) ──────────────── */
export const USER_FIELDS = "name picture";

const toUser = (u: any) =>
  u && typeof u === "object" ? { _id: String(u._id), name: u.name, picture: u.picture } : null;

/** `project` must be populated (createdBy + collaborators) and may be lean. */
export const decorateProject = (p: any, stats: TaskStats | undefined, userId: string) => {
  const s = stats ?? emptyStats();
  const owner = toUser(p.createdBy);
  const collaborators = (p.collaborators ?? []).map(toUser).filter(Boolean);
  const isOwner = owner?._id === userId;
  const visibility = p.visibility ?? (collaborators.length ? "team" : "private");
  return {
    _id: String(p._id),
    title: p.title,
    description: p.description ?? "",
    category: p.category ?? "Other",
    color: p.color ?? "violet",
    icon: p.icon ?? "folder",
    visibility,
    startDate: p.startDate ?? null,
    deadline: p.deadline ?? null,
    archived: !!p.archived,
    archivedAt: p.archivedAt ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    lastActivityAt: p.lastActivityAt ?? p.updatedAt,
    owner,
    members: [
      ...(owner ? [{ ...owner, role: "owner" as const, isMe: owner._id === userId }] : []),
      ...collaborators.map((c: any) => ({ ...c, role: "member" as const, isMe: c._id === userId })),
    ],
    role: isOwner ? ("owner" as const) : ("member" as const),
    stats: s,
    status: deriveStatus(s),
  };
};

export const decorateTask = (t: any, viewer?: { userId: string; isOwner: boolean }) => {
  const o = typeof t.toObject === "function" ? t.toObject() : t;
  return {
    _id: String(o._id),
    projectId: String(o.projectId),
    title: o.title,
    description: o.description ?? "",
    assignedTo: toUser(o.assignedTo),
    dueDate: o.dueDate ?? null,
    priority: o.priority,
    status: o.status,
    subtasks: (o.subtasks ?? []).map((s: any) => ({ _id: String(s._id), title: s.title, done: !!s.done })),
    createdBy: o.createdBy && o.createdBy._id ? toUser(o.createdBy) : { _id: String(o.createdBy) },
    canDelete: !!viewer && (viewer.isOwner || String(o.createdBy?._id ?? o.createdBy) === viewer.userId),
    completedAt: o.completedAt ?? null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

export const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  if (!domain) return "";
  return `${name.slice(0, 1)}•••@${domain}`;
};

/* ── Activity + notifications (best effort, never throw) ────────── */
export const logActivity = async (
  projectId: any,
  actorId: string,
  type: string,
  text: string
) => {
  try {
    await Promise.all([
      ProjectActivity.create({ projectId, actorId, type, text: text.slice(0, 300) }),
      Project.updateOne({ _id: projectId }, { $set: { lastActivityAt: new Date() } }),
    ]);
  } catch (e) {
    console.warn("[Project] activity log failed:", e);
  }
};

export const notify = async (userId: string, title: string, message: string) => {
  try {
    await createNotification({ userId, title, message });
  } catch (e) {
    console.warn("[Project] notification failed:", e);
  }
};

export const quote = (s: string) => `“${s.length > 60 ? s.slice(0, 57) + "…" : s}”`;

export const paginate = (query: Request["query"], defaultLimit = 20, maxLimit = 50) => {
  const page = Math.max(1, parseInt(String(query.page ?? "1"), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(query.limit ?? defaultLimit), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

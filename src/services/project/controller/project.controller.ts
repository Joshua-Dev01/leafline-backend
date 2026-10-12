import { Request, Response } from "express";
import { Project } from "../model/projects.model";
import {
  ProjectActivity,
  ProjectComment,
  ProjectFile,
  ProjectInvitation,
  ProjectTask,
} from "../model/projectExtras.model";
import { deleteLibraryFile } from "../../Library/utils/library.utils";
import {
  USER_FIELDS,
  countActiveOwned,
  decorateProject,
  getProjectLimit,
  getTaskStats,
  limitMessage,
  logActivity,
  notify,
  paginate,
  quote,
} from "../utils/project.helpers";

const populateUsers = [
  { path: "createdBy", select: USER_FIELDS },
  { path: "collaborators", select: USER_FIELDS },
];

/** Blocks the request when the user is at their active-project limit. */
const enforceLimit = async (req: Request, res: Response): Promise<boolean> => {
  const { max, plan } = await getProjectLimit(req.user!.id, req.user!.role);
  if (max === null) return true;
  const used = await countActiveOwned(req.user!.id);
  if (used >= max) {
    res.status(403).json({
      message: limitMessage(max, plan),
      code: "PROJECT_LIMIT_REACHED",
      limit: { used, max, plan },
    });
    return false;
  }
  return true;
};

/** Close the race where parallel requests slip past the check above. */
const undoIfOverLimit = async (req: Request, res: Response, projectId: any) => {
  const { max, plan } = await getProjectLimit(req.user!.id, req.user!.role);
  if (max === null) return false;
  const used = await countActiveOwned(req.user!.id);
  if (used <= max) return false;
  await Promise.all([Project.deleteOne({ _id: projectId }), ProjectTask.deleteMany({ projectId })]);
  res.status(403).json({
    message: limitMessage(max, plan),
    code: "PROJECT_LIMIT_REACHED",
    limit: { used: max, max, plan },
  });
  return true;
};

const accessibleFilter = (uid: string) => ({ $or: [{ createdBy: uid }, { collaborators: uid }] });

/* ── GET /project?tab&q&category&status&deadline&sort&page&limit ── */
export const listProjects = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const { tab = "all", q, category, status, deadline, sort = "recent" } = req.query as Record<string, string>;
  const { page, limit, skip } = paginate(req.query, 12, 50);

  const all = await Project.find(accessibleFilter(uid))
    .populate(populateUsers)
    .sort({ lastActivityAt: -1, updatedAt: -1 })
    .lean();
  const stats = await getTaskStats(all.map((p) => p._id));
  const items = all.map((p) => decorateProject(p, stats.get(String(p._id)), uid));

  const active = items.filter((p) => !p.archived);
  const counts = {
    all: active.length,
    mine: active.filter((p) => p.role === "owner").length,
    team: active.filter((p) => p.visibility === "team").length,
    archived: items.filter((p) => p.archived).length,
  };

  let list =
    tab === "archived"
      ? items.filter((p) => p.archived)
      : tab === "mine"
        ? active.filter((p) => p.role === "owner")
        : tab === "team"
          ? active.filter((p) => p.visibility === "team")
          : active;

  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    list = list.filter(
      (p) => p.title.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle)
    );
  }
  if (category) list = list.filter((p) => p.category === category);
  if (status) list = list.filter((p) => p.status === status);

  if (deadline) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    list = list.filter((p) => {
      const d = p.deadline ? new Date(p.deadline).getTime() : null;
      if (deadline === "none") return d === null;
      if (d === null) return false;
      if (deadline === "overdue") return d < now && p.status !== "completed";
      if (deadline === "7d") return d >= now && d <= now + 7 * day;
      if (deadline === "30d") return d >= now && d <= now + 30 * day;
      return true;
    });
  }

  const byDeadline = (a: any, b: any) =>
    (a.deadline ? new Date(a.deadline).getTime() : Infinity) -
    (b.deadline ? new Date(b.deadline).getTime() : Infinity);
  if (sort === "deadline") list = [...list].sort(byDeadline);
  else if (sort === "progress") list = [...list].sort((a, b) => b.stats.percent - a.stats.percent);
  else if (sort === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
  // "recent" keeps the lastActivityAt order from the query.

  const total = list.length;
  return res.status(200).json({
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    counts,
    projects: list.slice(skip, skip + limit),
  });
};

/* ── GET /project/summary ─────────────────────────────────────── */
export const getSummary = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const [projects, limit, used] = await Promise.all([
    Project.find({ ...accessibleFilter(uid), archived: { $ne: true } }).select("title deadline").lean(),
    getProjectLimit(uid, req.user!.role),
    countActiveOwned(uid),
  ]);
  const stats = await getTaskStats(projects.map((p) => p._id));

  const now = Date.now();
  const week = now + 7 * 24 * 60 * 60 * 1000;
  let inProgress = 0;
  let completed = 0;
  let notStarted = 0;
  const upcoming: { title: string; deadline: Date }[] = [];

  projects.forEach((p) => {
    const s = stats.get(String(p._id));
    const done = !!s && s.total > 0 && s.completed === s.total;
    if (done) completed += 1;
    else if (s && (s.completed > 0 || s.inProgress > 0)) inProgress += 1;
    else notStarted += 1;

    const d = p.deadline ? new Date(p.deadline).getTime() : null;
    if (!done && d !== null && d >= now && d <= week)
      upcoming.push({ title: p.title, deadline: p.deadline as Date });
  });
  upcoming.sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));

  return res.status(200).json({
    total: projects.length,
    inProgress,
    completed,
    notStarted,
    upcomingDeadlines: upcoming.length,
    nextDeadline: upcoming[0] ?? null,
    limit: { used, max: limit.max, plan: limit.plan },
  });
};

/* ── POST /project ────────────────────────────────────────────── */
export const createProject = async (req: Request, res: Response) => {
  if (!(await enforceLimit(req, res))) return;
  const b = req.body;

  const project = await Project.create({
    title: b.title,
    description: b.description || undefined,
    category: b.category,
    startDate: b.startDate || undefined,
    deadline: b.deadline || undefined,
    visibility: b.visibility,
    color: b.color,
    icon: b.icon,
    createdBy: req.user!.id,
    collaborators: [],
  });

  if (await undoIfOverLimit(req, res, project._id)) return;

  await logActivity(project._id, req.user!.id, "project.created", "created the project");
  await project.populate(populateUsers);
  return res
    .status(201)
    .json({ message: "Project created", project: decorateProject(project.toObject(), undefined, req.user!.id) });
};

/* ── GET /project/:projectId ──────────────────────────────────── */
export const getProject = async (req: Request, res: Response) => {
  const { project, isOwner, userId } = req.access!;
  await project.populate(populateUsers);
  const stats = await getTaskStats([project._id]);

  const pending = isOwner
    ? await ProjectInvitation.find({ projectId: project._id, status: "pending" })
        .populate("inviteeId", USER_FIELDS)
        .sort({ createdAt: -1 })
        .lean()
    : [];

  return res.status(200).json({
    project: decorateProject(project.toObject(), stats.get(String(project._id)), userId),
    pendingInvitations: pending.map((i: any) => ({
      _id: String(i._id),
      createdAt: i.createdAt,
      invitee: i.inviteeId
        ? { _id: String(i.inviteeId._id), name: i.inviteeId.name, picture: i.inviteeId.picture }
        : null,
    })),
  });
};

/* ── PATCH /project/:projectId (owner) ────────────────────────── */
export const updateProject = async (req: Request, res: Response) => {
  const { project, userId } = req.access!;
  const b = req.body;

  if (b.visibility === "private" && project.collaborators.length > 0)
    return res.status(409).json({
      message: "Remove the other members before making this project private.",
    });

  const startDate = b.startDate !== undefined ? b.startDate : project.startDate;
  const deadline = b.deadline !== undefined ? b.deadline : project.deadline;
  if (startDate && deadline && new Date(deadline) < new Date(startDate))
    return res.status(400).json({ message: "The deadline can't be before the start date" });

  if (b.visibility === "private")
    await ProjectInvitation.updateMany(
      { projectId: project._id, status: "pending" },
      { $set: { status: "cancelled" } }
    );

  (["title", "description", "category", "visibility", "color", "icon"] as const).forEach((k) => {
    if (b[k] !== undefined) (project as any)[k] = b[k];
  });
  if (b.startDate !== undefined) project.startDate = b.startDate ?? undefined;
  if (b.deadline !== undefined) project.deadline = b.deadline ?? undefined;
  await project.save();

  await logActivity(project._id, userId, "project.updated", "updated the project details");
  await project.populate(populateUsers);
  const stats = await getTaskStats([project._id]);
  return res.status(200).json({
    message: "Project updated",
    project: decorateProject(project.toObject(), stats.get(String(project._id)), userId),
  });
};

/* ── POST /project/:projectId/archive | restore (owner) ───────── */
export const archiveProject = async (req: Request, res: Response) => {
  const { project, userId } = req.access!;
  if (project.archived) return res.status(200).json({ message: "Already archived" });
  project.archived = true;
  project.archivedAt = new Date();
  await project.save();
  await logActivity(project._id, userId, "project.archived", "archived the project");
  return res.status(200).json({ message: "Project archived" });
};

export const restoreProject = async (req: Request, res: Response) => {
  const { project, userId } = req.access!;
  if (!project.archived) return res.status(200).json({ message: "Project is already active" });
  // Restoring makes it count toward the limit again — don't let it be a loophole.
  if (!(await enforceLimit(req, res))) return;
  project.archived = false;
  project.archivedAt = undefined;
  await project.save();
  if (await undoRestoreIfOverLimit(req, res, project._id)) return;
  await logActivity(project._id, userId, "project.restored", "restored the project");
  return res.status(200).json({ message: "Project restored" });
};

const undoRestoreIfOverLimit = async (req: Request, res: Response, projectId: any) => {
  const { max, plan } = await getProjectLimit(req.user!.id, req.user!.role);
  if (max === null) return false;
  const used = await countActiveOwned(req.user!.id);
  if (used <= max) return false;
  await Project.updateOne({ _id: projectId }, { $set: { archived: true, archivedAt: new Date() } });
  res.status(403).json({
    message: limitMessage(max, plan),
    code: "PROJECT_LIMIT_REACHED",
    limit: { used: max, max, plan },
  });
  return true;
};

/* ── DELETE /project/:projectId (owner) ───────────────────────── */
export const deleteProject = async (req: Request, res: Response) => {
  const { project } = req.access!;
  const files = await ProjectFile.find({ projectId: project._id }).select("publicId cloudResourceType");

  await Promise.all([
    ProjectTask.deleteMany({ projectId: project._id }),
    ProjectComment.deleteMany({ projectId: project._id }),
    ProjectActivity.deleteMany({ projectId: project._id }),
    ProjectInvitation.deleteMany({ projectId: project._id }),
    ProjectFile.deleteMany({ projectId: project._id }),
    ...files.map((f) => deleteLibraryFile(f.publicId, f.cloudResourceType)),
  ]);
  await Project.deleteOne({ _id: project._id });

  // Let members know it's gone.
  await Promise.all(
    project.collaborators.map((m) =>
      notify(m.toString(), "Project deleted", `${quote(project.title)} was deleted by its owner.`)
    )
  );
  return res.status(200).json({ message: "Project deleted" });
};

/* ── POST /project/:projectId/duplicate (owner) ───────────────── */
export const duplicateProject = async (req: Request, res: Response) => {
  const { project, userId } = req.access!;
  if (!(await enforceLimit(req, res))) return;

  const copy = await Project.create({
    title: `${project.title}`.slice(0, 92) + " (copy)",
    description: project.description,
    category: project.category,
    startDate: project.startDate,
    deadline: project.deadline,
    visibility: "private", // members and files aren't copied
    color: project.color,
    icon: project.icon,
    createdBy: userId,
    collaborators: [],
  });
  if (await undoIfOverLimit(req, res, copy._id)) return;

  const tasks = await ProjectTask.find({ projectId: project._id }).lean();
  if (tasks.length)
    await ProjectTask.insertMany(
      tasks.map((t) => ({
        projectId: copy._id,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate,
        priority: t.priority,
        status: "not-started",
        assignedTo: null,
        createdBy: userId,
        subtasks: (t.subtasks ?? []).map((s: any) => ({ title: s.title, done: false })),
      }))
    );

  await logActivity(copy._id, userId, "project.created", `created this project as a copy of ${quote(project.title)}`);
  await copy.populate(populateUsers);
  const stats = await getTaskStats([copy._id]);
  return res.status(201).json({
    message: "Project duplicated",
    project: decorateProject(copy.toObject(), stats.get(String(copy._id)), userId),
  });
};


import { Request, Response } from "express";
import mongoose from "mongoose";
import { ProjectTask } from "../model/projectExtras.model";
import {
  USER_FIELDS,
  decorateTask,
  isProjectMember,
  logActivity,
  notify,
  quote,
} from "../utils/project.helpers";

const STATUS_LABEL: Record<string, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  completed: "Completed",
};

const populateTask = (q: any) => q.populate("assignedTo", USER_FIELDS).populate("createdBy", USER_FIELDS);

/** Tasks may only be given to the owner or a member of THIS project. */
const assigneeAllowed = (project: any, assignedTo: string | null | undefined) =>
  !assignedTo || isProjectMember(project, String(assignedTo));

const findTask = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = await ProjectTask.findOne({ _id: taskId, projectId: req.access!.project._id });
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return null;
  }
  return task;
};

const viewerOf = (req: Request) => ({ userId: req.access!.userId, isOwner: req.access!.isOwner });

const sendTask = async (req: Request, res: Response, id: any, status = 200, message?: string) => {
  const fresh = await populateTask(ProjectTask.findById(id));
  return res
    .status(status)
    .json({ ...(message ? { message } : {}), task: decorateTask(fresh, viewerOf(req)) });
};

/* GET /project/:projectId/tasks */
export const listTasks = async (req: Request, res: Response) => {
  const tasks = await populateTask(
    ProjectTask.find({ projectId: req.access!.project._id }).sort({ createdAt: 1 })
  );
  return res.status(200).json({ tasks: tasks.map((t: any) => decorateTask(t, viewerOf(req))) });
};

/* POST /project/:projectId/tasks */
export const createTask = async (req: Request, res: Response) => {
  const { project, userId } = req.access!;
  const b = req.body;
  if (!assigneeAllowed(project, b.assignedTo))
    return res.status(400).json({ message: "You can only assign tasks to people in this project" });

  const status = b.status ?? "not-started";
  const task = await ProjectTask.create({
    projectId: project._id,
    title: b.title,
    description: b.description || undefined,
    assignedTo: b.assignedTo ?? null,
    dueDate: b.dueDate ?? null,
    priority: b.priority ?? "medium",
    status,
    completedAt: status === "completed" ? new Date() : undefined,
    subtasks: (b.subtasks ?? []).map((title: string) => ({ title })),
    createdBy: userId,
  });

  await logActivity(project._id, userId, "task.created", `added task ${quote(task.title)}`);
  if (task.assignedTo && String(task.assignedTo) !== userId)
    await notify(
      String(task.assignedTo),
      "New task assigned",
      `${req.user!.name} assigned you ${quote(task.title)} in ${quote(project.title)}.`
    );
  return sendTask(req, res, task._id, 201, "Task added");
};

/* PATCH /project/:projectId/tasks/:taskId */
export const updateTask = async (req: Request, res: Response) => {
  const { project, userId } = req.access!;
  const task = await findTask(req, res);
  if (!task) return;
  const b = req.body;

  if (b.assignedTo !== undefined && !assigneeAllowed(project, b.assignedTo))
    return res.status(400).json({ message: "You can only assign tasks to people in this project" });

  const prevStatus = task.status;
  const prevAssignee = task.assignedTo ? String(task.assignedTo) : null;

  if (b.title !== undefined) task.title = b.title;
  if (b.description !== undefined) task.description = b.description;
  if (b.priority !== undefined) task.priority = b.priority;
  if (b.dueDate !== undefined) task.dueDate = b.dueDate;
  if (b.assignedTo !== undefined) task.assignedTo = b.assignedTo;
  if (b.status !== undefined) {
    task.status = b.status;
    task.completedAt = b.status === "completed" ? (task.completedAt ?? new Date()) : undefined;
  }
  await task.save();

  if (b.status !== undefined && b.status !== prevStatus) {
    await logActivity(
      project._id,
      userId,
      b.status === "completed" ? "task.completed" : "task.status",
      b.status === "completed"
        ? `completed ${quote(task.title)}`
        : `moved ${quote(task.title)} to ${STATUS_LABEL[b.status]}`
    );
  } else {
    await logActivity(project._id, userId, "task.updated", `updated ${quote(task.title)}`);
  }

  const newAssignee = task.assignedTo ? String(task.assignedTo) : null;
  if (newAssignee && newAssignee !== prevAssignee && newAssignee !== userId)
    await notify(
      newAssignee,
      "New task assigned",
      `${req.user!.name} assigned you ${quote(task.title)} in ${quote(project.title)}.`
    );

  return sendTask(req, res, task._id, 200, "Task updated");
};

/* DELETE /project/:projectId/tasks/:taskId  (owner or the person who created it) */
export const deleteTask = async (req: Request, res: Response) => {
  const { project, userId, isOwner } = req.access!;
  const task = await findTask(req, res);
  if (!task) return;
  if (!isOwner && String(task.createdBy) !== userId)
    return res.status(403).json({ message: "Only the project owner or the task's creator can delete it" });

  await task.deleteOne();
  await logActivity(project._id, userId, "task.deleted", `deleted task ${quote(task.title)}`);
  return res.status(200).json({ message: "Task deleted" });
};

/* ── Subtasks ─────────────────────────────────────────────────── */
export const addSubtask = async (req: Request, res: Response) => {
  const task = await findTask(req, res);
  if (!task) return;
  if (task.subtasks.length >= 30)
    return res.status(400).json({ message: "A task can have up to 30 subtasks" });
  task.subtasks.push({ title: req.body.title, done: false } as any);
  await task.save();
  return sendTask(req, res, task._id, 201);
};

export const updateSubtask = async (req: Request, res: Response) => {
  const { project, userId } = req.access!;
  const task = await findTask(req, res);
  if (!task) return;
  const sub = mongoose.isValidObjectId(req.params.subtaskId)
    ? task.subtasks.id(req.params.subtaskId)
    : null;
  if (!sub) return res.status(404).json({ message: "Subtask not found" });

  const wasDone = sub.done;
  if (req.body.title !== undefined) sub.title = req.body.title;
  if (req.body.done !== undefined) sub.done = req.body.done;
  await task.save();

  if (req.body.done === true && !wasDone)
    await logActivity(project._id, userId, "subtask.done", `checked off ${quote(sub.title)} in ${quote(task.title)}`);
  return sendTask(req, res, task._id);
};

export const deleteSubtask = async (req: Request, res: Response) => {
  const task = await findTask(req, res);
  if (!task) return;
  const sub = mongoose.isValidObjectId(req.params.subtaskId)
    ? task.subtasks.id(req.params.subtaskId)
    : null;
  if (!sub) return res.status(404).json({ message: "Subtask not found" });
  sub.deleteOne();
  await task.save();
  return sendTask(req, res, task._id);
};


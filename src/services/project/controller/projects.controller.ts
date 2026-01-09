import { Request, Response } from "express";
import { ITask, Project } from "../model/projects.model";
import { LeafLineUser } from "../../../MainAuth/signup/model/user.model";

/**
 * Reusable population config
 */
const userPopulate = {
  select: "name email picture",
  populate: {
    path: "picture",
    select: "url",
  },
};

// ✅ Create a project
export const createProject = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await Project.create({
      title: req.body.title,
      description: req.body.description,
      createdBy: req.user.id,
      tasks: [],
      collaborators: [],
    });

    await project.populate({ path: "createdBy", ...userPopulate });

    res.status(201).json({
      message: "Project created",
      project,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get projects (with filters, search, sort)
export const getProjects = async (req: any, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sort,
    } = req.query;

    const projects = await Project.find({
      $or: [{ createdBy: req.user.id }, { collaborators: req.user.id }],
    })
      .populate({ path: "createdBy", ...userPopulate })
      .populate({ path: "tasks.assignedTo", ...userPopulate })
      .populate({ path: "collaborators", ...userPopulate });

    const filteredProjects = projects.map((proj) => {
      let tasks: ITask[] = proj.tasks.map((t) => t.toObject());

      // If not creator, show only assigned tasks
      if (proj.createdBy._id.toString() !== req.user.id) {
        tasks = tasks.filter(
          (task) => task.assignedTo?._id?.toString() === req.user.id
        );
      }

      // Filter by status
      if (status) {
        tasks = tasks.filter((task) => task.status === status);
      }

      // Search project or task title
      if (search) {
        const keyword = (search as string).toLowerCase();
        if (!proj.title.toLowerCase().includes(keyword)) {
          tasks = tasks.filter((task) =>
            task.title.toLowerCase().includes(keyword)
          );
        }
      }

      // Sort tasks
      if (sort === "latest") {
        tasks.sort(
          (a, b) =>
            (b._id?.getTimestamp().getTime() ?? 0) -
            (a._id?.getTimestamp().getTime() ?? 0)
        );
      } else if (sort === "oldest") {
        tasks.sort(
          (a, b) =>
            (a._id?.getTimestamp().getTime() ?? 0) -
            (b._id?.getTimestamp().getTime() ?? 0)
        );
      } else if (sort === "status") {
        const order: Record<string, number> = {
          pending: 0,
          "in-progress": 1,
          completed: 2,
        };
        tasks.sort((a, b) => order[a.status] - order[b.status]);
      }

      return { ...proj.toObject(), tasks };
    });

    // Pagination
    const total = filteredProjects.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedProjects = filteredProjects.slice(
      startIndex,
      startIndex + Number(limit)
    );

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      projects: paginatedProjects,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Add a task
export const addTask = async (req: any, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title, assignedTo } = req.body;

    if (!title || !assignedTo) {
      return res
        .status(400)
        .json({ message: "Title and assignedTo required" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAllowed =
      assignedTo === project.createdBy.toString() ||
      project.collaborators.some((id) => id.toString() === assignedTo);

    if (!isAllowed) {
      return res.status(403).json({
        message: "User is not a collaborator or project creator",
      });
    }

    project.tasks.push({
      title,
      assignedTo,
      status: "pending",
    });

    await project.save();

    await project.populate({ path: "createdBy", ...userPopulate });
    await project.populate({ path: "tasks.assignedTo", ...userPopulate });

    res.json({ message: "Task added", project });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update task status
export const updateTaskStatus = async (req: any, res: Response) => {
  try {
    const { projectId, taskId } = req.params;
    const { status } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const task = project.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      task.assignedTo.toString() !== req.user.id &&
      project.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    task.status = status;
    await project.save();

    await project.populate({ path: "createdBy", ...userPopulate });
    await project.populate({ path: "tasks.assignedTo", ...userPopulate });

    res.json({ message: "Task updated", project });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete task
export const deleteTask = async (req: any, res: Response) => {
  try {
    const { projectId, taskId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.tasks.pull(taskId);
    await project.save();

    await project.populate({ path: "createdBy", ...userPopulate });
    await project.populate({ path: "tasks.assignedTo", ...userPopulate });

    res.json({ message: "Task deleted", project });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Invite collaborator
export const inviteCollaborator = async (req: any, res: Response) => {
  try {
    const { projectId } = req.params;
    const { identifier } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.createdBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only creator can invite collaborators" });
    }

    const user = await LeafLineUser.findOne({
      $or: [{ email: identifier }, { name: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!project.collaborators.includes(user._id)) {
      project.collaborators.push(user._id);
      await project.save();
    }

    await project.populate({ path: "createdBy", ...userPopulate });
    await project.populate({ path: "tasks.assignedTo", ...userPopulate });
    await project.populate({ path: "collaborators", ...userPopulate });

    res.json({
      message: `${user.name} added as collaborator`,
      project,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

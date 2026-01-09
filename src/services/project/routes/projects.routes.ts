import { Router } from "express";
import {
    createProject,
    getProjects,
    addTask,
    updateTaskStatus,
    deleteTask,
    inviteCollaborator, // ✅ import invite
} from "../controller/projects.controller";
import { protect } from "../../../MainAuth/middleware/protect";
import catchAsync from "../../../utils/catchAsync";

const projectRouter = Router();

// ✅ Projects
projectRouter.post("/create-project", catchAsync(protect), catchAsync(createProject));
projectRouter.get("/project", catchAsync(protect), catchAsync(getProjects));

// ✅ Tasks
projectRouter.post("/:projectId/tasks", catchAsync(protect), catchAsync(addTask));
projectRouter.put("/:projectId/tasks/:taskId/status", catchAsync(protect), catchAsync(updateTaskStatus));
projectRouter.delete("/:projectId/tasks/:taskId", catchAsync(protect), catchAsync(deleteTask));

// ✅ Collaborators
projectRouter.post("/:projectId/invite", catchAsync(protect), catchAsync(inviteCollaborator));

export default projectRouter;

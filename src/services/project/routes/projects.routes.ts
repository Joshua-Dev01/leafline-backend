import { NextFunction, Request, Response, Router } from "express";
import { protect } from "../../../MainAuth/middleware/protect";
import { attachPictures } from "../../../MainAuth/pictures/attachPictures";
import catchAsync from "../../../utils/catchAsync";
import { validate as joiValidate } from "../../Events/middleware/validate";
import { uploadLibraryFileField } from "../../Library/middleware/libraryUpload";
import {
  archiveProject,
  createProject,
  deleteProject,
  duplicateProject,
  getProject,
  getSummary,
  listProjects,
  restoreProject,
  updateProject,
} from "../controller/project.controller";
import {
  addSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  listTasks,
  updateSubtask,
  updateTask,
} from "../controller/task.controller";
import {
  acceptInvitation,
  cancelInvitation,
  declineInvitation,
  inviteMember,
  myInvitations,
  removeMember,
  searchUsers,
} from "../controller/collab.controller";
import {
  addComment,
  deleteComment,
  deleteFile,
  getFileLink,
  listActivity,
  listComments,
  listFiles,
  uploadFile,
} from "../controller/engage.controller";
import { requireProjectAccess, validateObjectIdParam } from "../utils/project.helpers";
import {
  commentSchema,
  createProjectSchema,
  createSubtaskSchema,
  createTaskSchema,
  inviteSchema,
  updateProjectSchema,
  updateSubtaskSchema,
  updateTaskSchema,
} from "../validation/project.validation";

const projectRouter = Router();

// Turn each person's picture id into their real profile-picture URL.
projectRouter.use(attachPictures);

// Every :id in a path must be a valid ObjectId.
["projectId", "taskId", "subtaskId", "commentId", "fileId", "invitationId", "userId"].forEach((p) =>
  projectRouter.param(p, validateObjectIdParam)
);

const validate = (schema: Parameters<typeof joiValidate>[0]) => catchAsync(joiValidate(schema));
const auth = catchAsync(protect);
// Access levels (non-members always get a 404):
const member = catchAsync(requireProjectAccess()); // read
const memberWrite = catchAsync(requireProjectAccess({ write: true })); // blocked on archived
const owner = catchAsync(requireProjectAccess({ ownerOnly: true })); // owner, even if archived
const ownerWrite = catchAsync(requireProjectAccess({ ownerOnly: true, write: true }));

/* ── Overview ── */
projectRouter.get("/", auth, catchAsync(listProjects));
projectRouter.get("/summary", auth, catchAsync(getSummary));
projectRouter.post("/", auth, validate(createProjectSchema), catchAsync(createProject));
// Legacy paths kept so older callers keep working.
projectRouter.get("/project", auth, catchAsync(listProjects));
projectRouter.post("/create-project", auth, validate(createProjectSchema), catchAsync(createProject));

/* ── Invitations & people (before /:projectId so the paths don't clash) ── */
projectRouter.get("/users/search", auth, catchAsync(searchUsers));
projectRouter.get("/invitations/mine", auth, catchAsync(myInvitations));
projectRouter.post("/invitations/:invitationId/accept", auth, catchAsync(acceptInvitation));
projectRouter.post("/invitations/:invitationId/decline", auth, catchAsync(declineInvitation));

/* ── Single project ── */
projectRouter.get("/:projectId", auth, member, catchAsync(getProject));
projectRouter.patch("/:projectId", auth, ownerWrite, validate(updateProjectSchema), catchAsync(updateProject));
projectRouter.delete("/:projectId", auth, owner, catchAsync(deleteProject));
projectRouter.post("/:projectId/archive", auth, owner, catchAsync(archiveProject));
projectRouter.post("/:projectId/restore", auth, owner, catchAsync(restoreProject));
projectRouter.post("/:projectId/duplicate", auth, owner, catchAsync(duplicateProject));

/* ── Members ── */
projectRouter.post("/:projectId/invitations", auth, ownerWrite, validate(inviteSchema), catchAsync(inviteMember));
projectRouter.delete("/:projectId/invitations/:invitationId", auth, ownerWrite, catchAsync(cancelInvitation));
projectRouter.delete("/:projectId/members/:userId", auth, memberWrite, catchAsync(removeMember));

/* ── Tasks ── */
projectRouter.get("/:projectId/tasks", auth, member, catchAsync(listTasks));
projectRouter.post("/:projectId/tasks", auth, memberWrite, validate(createTaskSchema), catchAsync(createTask));
projectRouter.patch("/:projectId/tasks/:taskId", auth, memberWrite, validate(updateTaskSchema), catchAsync(updateTask));
projectRouter.delete("/:projectId/tasks/:taskId", auth, memberWrite, catchAsync(deleteTask));
projectRouter.post("/:projectId/tasks/:taskId/subtasks", auth, memberWrite, validate(createSubtaskSchema), catchAsync(addSubtask));
projectRouter.patch("/:projectId/tasks/:taskId/subtasks/:subtaskId", auth, memberWrite, validate(updateSubtaskSchema), catchAsync(updateSubtask));
projectRouter.delete("/:projectId/tasks/:taskId/subtasks/:subtaskId", auth, memberWrite, catchAsync(deleteSubtask));

/* ── Discussion & activity ── */
projectRouter.get("/:projectId/comments", auth, member, catchAsync(listComments));
projectRouter.post("/:projectId/comments", auth, memberWrite, validate(commentSchema), catchAsync(addComment));
projectRouter.delete("/:projectId/comments/:commentId", auth, memberWrite, catchAsync(deleteComment));
projectRouter.get("/:projectId/activity", auth, member, catchAsync(listActivity));

/* ── Files (membership is checked BEFORE multer reads the upload) ── */
projectRouter.get("/:projectId/files", auth, member, catchAsync(listFiles));
projectRouter.post("/:projectId/files", auth, memberWrite, uploadLibraryFileField, catchAsync(uploadFile));
projectRouter.get("/:projectId/files/:fileId/link", auth, member, catchAsync(getFileLink));
projectRouter.delete("/:projectId/files/:fileId", auth, memberWrite, catchAsync(deleteFile));

// Safe JSON errors for anything unexpected (no stack traces to the client).
projectRouter.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.name === "CastError" || err?.name === "ValidationError") {
    res.status(400).json({ message: "Invalid request" });
    return;
  }
  console.error("[Project] unexpected error:", err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

export default projectRouter;
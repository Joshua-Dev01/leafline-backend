import { Request, Response } from "express";
import { LeafLineUser } from "../../../MainAuth/signup/model/user.model";
import { escapeRegex } from "../../Library/utils/library.utils";
import { Project } from "../model/projects.model";
import { ProjectInvitation, ProjectTask } from "../model/projectExtras.model";
import { MAX_PROJECT_MEMBERS } from "../utils/project.constants";
import {
  USER_FIELDS,
  logActivity,
  maskEmail,
  notify,
  quote,
} from "../utils/project.helpers";

/* GET /project/users/search?q=  — names only; never full emails */
export const searchUsers = async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) return res.status(200).json({ users: [] });

  const filter: any = q.includes("@")
    ? { email: q.toLowerCase() }
    : { name: { $regex: escapeRegex(q), $options: "i" } };

  const users = await LeafLineUser.find({
    ...filter,
    _id: { $ne: req.user!.id },
    isVerified: true,
  })
    .select("name email picture")
    .limit(8)
    .lean();

  return res.status(200).json({
    users: users.map((u: any) => ({
      _id: String(u._id),
      name: u.name,
      picture: u.picture,
      emailHint: maskEmail(u.email),
    })),
  });
};

/* POST /project/:projectId/invitations  (owner) */
export const inviteMember = async (req: Request, res: Response) => {
  const { project, userId } = req.access!;

  if ((project.visibility ?? "private") !== "team" && project.collaborators.length === 0)
    return res.status(409).json({
      message: "This is a private project. Change it to a team project to invite people.",
    });

  const invitee = req.body.userId
    ? await LeafLineUser.findById(req.body.userId).select("name isVerified")
    : await LeafLineUser.findOne({ email: String(req.body.email).toLowerCase() }).select("name isVerified");
  if (!invitee || !invitee.isVerified)
    return res.status(404).json({ message: "No LeafLine user found with those details" });

  const inviteeId = String(invitee._id);
  if (inviteeId === userId) return res.status(400).json({ message: "You're already the owner" });
  if (project.collaborators.some((c) => c.toString() === inviteeId))
    return res.status(409).json({ message: `${invitee.name} is already on this project` });
  if (project.collaborators.length + 1 >= MAX_PROJECT_MEMBERS)
    return res.status(409).json({ message: `A project can have up to ${MAX_PROJECT_MEMBERS} members` });

  try {
    const inv = await ProjectInvitation.create({
      projectId: project._id,
      inviterId: userId,
      inviteeId,
    });
    await logActivity(project._id, userId, "member.invited", `invited ${invitee.name}`);
    await notify(
      inviteeId,
      "Project invitation",
      `${req.user!.name} invited you to join ${quote(project.title)}. Open Projects to accept or decline.`
    );
    return res.status(201).json({ message: `Invitation sent to ${invitee.name}`, invitationId: inv._id });
  } catch (e: any) {
    if (e?.code === 11000)
      return res.status(409).json({ message: `${invitee.name} already has a pending invitation` });
    throw e;
  }
};

/* DELETE /project/:projectId/invitations/:invitationId  (owner) */
export const cancelInvitation = async (req: Request, res: Response) => {
  const inv = await ProjectInvitation.findOneAndUpdate(
    { _id: req.params.invitationId, projectId: req.access!.project._id, status: "pending" },
    { $set: { status: "cancelled" } }
  );
  if (!inv) return res.status(404).json({ message: "Invitation not found" });
  return res.status(200).json({ message: "Invitation cancelled" });
};

/* GET /project/invitations/mine */
export const myInvitations = async (req: Request, res: Response) => {
  const invites = await ProjectInvitation.find({ inviteeId: req.user!.id, status: "pending" })
    .populate("inviterId", USER_FIELDS)
    .populate("projectId", "title category color icon archived visibility")
    .sort({ createdAt: -1 })
    .lean();

  const live = invites.filter((i: any) => i.projectId && !i.projectId.archived);
  return res.status(200).json({
    invitations: live.map((i: any) => ({
      _id: String(i._id),
      createdAt: i.createdAt,
      project: {
        _id: String(i.projectId._id),
        title: i.projectId.title,
        category: i.projectId.category ?? "Other",
        color: i.projectId.color ?? "violet",
        icon: i.projectId.icon ?? "folder",
      },
      inviter: i.inviterId
        ? { _id: String(i.inviterId._id), name: i.inviterId.name, picture: i.inviterId.picture }
        : null,
    })),
  });
};

const loadMyInvitation = async (req: Request, res: Response) => {
  const inv = await ProjectInvitation.findOne({
    _id: req.params.invitationId,
    inviteeId: req.user!.id,
    status: "pending",
  });
  if (!inv) {
    res.status(404).json({ message: "Invitation not found or already handled" });
    return null;
  }
  return inv;
};

/* POST /project/invitations/:invitationId/accept */
export const acceptInvitation = async (req: Request, res: Response) => {
  const inv = await loadMyInvitation(req, res);
  if (!inv) return;

  const project = await Project.findById(inv.projectId);
  if (!project || project.archived || project.visibility === "private") {
    inv.status = "cancelled";
    await inv.save();
    return res.status(410).json({ message: "This project is no longer available" });
  }
  if (project.collaborators.length + 1 >= MAX_PROJECT_MEMBERS)
    return res.status(409).json({ message: "This project is full" });

  await Project.updateOne(
    { _id: project._id },
    { $addToSet: { collaborators: req.user!.id } }
  );
  inv.status = "accepted";
  await inv.save();

  await logActivity(project._id, req.user!.id, "member.joined", "joined the project");
  await notify(
    String(inv.inviterId),
    "Invitation accepted",
    `${req.user!.name} joined ${quote(project.title)}.`
  );
  return res.status(200).json({ message: `You joined ${project.title}`, projectId: String(project._id) });
};

/* POST /project/invitations/:invitationId/decline */
export const declineInvitation = async (req: Request, res: Response) => {
  const inv = await loadMyInvitation(req, res);
  if (!inv) return;
  inv.status = "declined";
  await inv.save();
  return res.status(200).json({ message: "Invitation declined" });
};

/* DELETE /project/:projectId/members/:userId  (owner removes anyone; members may remove themselves) */
export const removeMember = async (req: Request, res: Response) => {
  const { project, userId, isOwner } = req.access!;
  const targetId = req.params.userId;
  const isSelf = targetId === userId;

  if (isOwner && isSelf)
    return res.status(400).json({ message: "Owners can't leave their own project. Delete or archive it instead." });
  if (!isOwner && !isSelf)
    return res.status(403).json({ message: "Only the project owner can remove other members" });
  if (!project.collaborators.some((c) => c.toString() === targetId))
    return res.status(404).json({ message: "That person isn't a member of this project" });

  const target = await LeafLineUser.findById(targetId).select("name");
  await Project.updateOne({ _id: project._id }, { $pull: { collaborators: targetId } });
  // Their open tasks go back to unassigned.
  await ProjectTask.updateMany({ projectId: project._id, assignedTo: targetId }, { $set: { assignedTo: null } });

  await logActivity(
    project._id,
    userId,
    isSelf ? "member.left" : "member.removed",
    isSelf ? "left the project" : `removed ${target?.name ?? "a member"} from the project`
  );
  if (!isSelf)
    await notify(targetId, "Removed from project", `You were removed from ${quote(project.title)}.`);

  return res.status(200).json({ message: isSelf ? "You left the project" : "Member removed" });
};

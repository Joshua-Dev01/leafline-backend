import express from "express";
import { protect } from "../../MainAuth/middleware/protect";
import catchAsync from "../../utils/catchAsync";
import { adminProtect } from "../middleware/admin.middleware";

import { checkRole } from "../middleware/checkRole";
import {
  adminLogin,
  createAdmin,
  getAllAdmins,
  removeAdmin,
} from "../controller/admin.controller";
import { superAdminSignup } from "../controller/superAdmin.controller";

const AdminRouter = express.Router();

// Super admin route

AdminRouter.post("/super-signup", catchAsync(superAdminSignup));
AdminRouter.post("/promote-admin", catchAsync(createAdmin));
AdminRouter.post("/login", catchAsync(adminLogin));
AdminRouter.delete(
  "/remove/:adminId",
  catchAsync(protect),
  catchAsync(removeAdmin)
);
AdminRouter.get(
  "/all-admin",
  catchAsync(protect),
  catchAsync(checkRole(["superadmin"])),
  catchAsync(getAllAdmins)
);

AdminRouter.get("/dashboard", catchAsync(adminProtect), (req, res) => {
  res.json({ message: "Welcome Admin Dashboard" });
});

export default AdminRouter;

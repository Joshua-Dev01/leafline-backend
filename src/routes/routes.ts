import express from "express";
import authrouter from "../auth/routes/auth.routes";
import BlogRouter from "../services/blog/routes/blog.route";

const router = express.Router();

// /auth routes
router.use("/auth", authrouter);
router.use("/blog", BlogRouter);

export default router;

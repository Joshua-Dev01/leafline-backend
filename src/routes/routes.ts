import express from "express";
import authrouter from "../auth/routes/auth.routes";
import BlogRouter from "../services/blog/routes/blog.route";
import AnalyticsRouter from "../services/analytics/routes/analytics.routes";
import OpenAIrouter from "../services/OpenAI/routes/openAi.route";


const router = express.Router();


router.use("/auth", authrouter);
router.use("/blog", BlogRouter);
router.use("/analytics", AnalyticsRouter);
export default router;

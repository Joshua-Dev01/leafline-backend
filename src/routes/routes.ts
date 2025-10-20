import express from "express";
import authrouter from "../auth/routes/auth.routes";
import BlogRouter from "../services/blog/routes/blog.route";
import AnalyticsRouter from "../services/analytics/routes/analytics.routes";
import OpenAIrouter from "../services/OpenAI/routes/openAi.route";
import NotificationsRouter from "../services/Notifications/routes/notification.routes";


const router = express.Router();


router.use("/auth", authrouter);
router.use("/blog", BlogRouter);
router.use("/analytics", AnalyticsRouter);
// router.use("/notifications", NotificationsRouter);
export default router;

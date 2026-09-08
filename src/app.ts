import express from "express";
import cors from "cors";
import subjectsRouter from "./services/Students/subjects/routes/subjects.route";
import OpenAIrouter from "./services/OpenAI/routes/openAi.route";
import NotificationsRouter from "./services/Notifications/routes/notification.routes";
import PicturesRouter from "./MainAuth/pictures/routes/pictures.routes";
import googleAuthRouter from "./MainAuth/googleAuth/routes/googleAuth.routes";
import { env } from "./config/env";
import Authrouter from "./MainAuth/routes/auth.routes";
import AdminRouter from "./admin/routes/admin.route";
import EventRouter from "./services/Events/routes/event.route";
import Analyticsrouter from "./services/analytics/routes/analytics.routes";
import projectRouter from "./services/project/routes/projects.routes";
import { scheduleEventReminders } from "./services/Events/controller/eventReminder.cron";





const app = express();
scheduleEventReminders();

// ✅ Secure, dynamic CORS setup
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (env.CLIENT_URLS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get("/", (_req, res) => {
  res.send("🌿 LeafLine API is running...");
});

//  Main routes
app.use("/api/v1", Authrouter);
app.use("/api/v1/auth/admin", AdminRouter);
app.use("/api/v1/auth", googleAuthRouter);
app.use("/api/v1/subjects", subjectsRouter);
app.use("/api/v1/chatAi", OpenAIrouter);
app.use("/api/v1/notifications", NotificationsRouter);
app.use("/api/v1/upload", PicturesRouter);
app.use("/api/v1/events", EventRouter);
app.use("/api/v1/analytics", Analyticsrouter);
app.use("/api/v1/project", projectRouter);

export default app;

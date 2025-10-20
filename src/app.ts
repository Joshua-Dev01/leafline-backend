// src/app.ts
import express from "express";
import cors from "cors";
import router from "./routes/routes";
import subjectsRouter from "./services/Students/subjects/routes/subjects.route";
import OpenAIrouter from "./services/OpenAI/routes/openAi.route";
import NotificationsRouter from "./services/Notifications/routes/notification.routes";
import PicturesRouter from "./auth/pictures/routes/pictures.routes";
import googleAuthRouter from "./auth/googleAuth/routes/googleAuth.routes";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send("🌿 LeafLine API is running...");
});

app.use("/api/v1", router);
app.use("/api/v1/auth", googleAuthRouter);
app.use("/api/v1/subjects", subjectsRouter);
app.use("/api/v1/chatAi", OpenAIrouter);
app.use("/api/v1/notifications", NotificationsRouter);
app.use("/api/v1/upload", PicturesRouter);

export default app;

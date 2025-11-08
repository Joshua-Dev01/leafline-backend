import express from "express";
import cors from "cors";
import subjectsRouter from "./services/Students/subjects/routes/subjects.route";
import OpenAIrouter from "./services/OpenAI/routes/openAi.route";
import NotificationsRouter from "./services/Notifications/routes/notification.routes";
import PicturesRouter from "./MainAuth/pictures/routes/pictures.routes";
import { env } from "./config/env";
import Authrouter from "./MainAuth/routes/auth.routes";
import AdminRouter from "./admin/routes/admin.route";

const app = express();

// ✅ Secure, dynamic CORS setup for JWT-based API
const corsOptions = {
  origin: (origin: string | undefined, callback: any) => {
    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);

    // Allow localhost (dev) and production frontend
    if (env.CLIENT_URLS.includes(origin)) return callback(null, true);

    console.log("Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: false, // ❌ JWT in headers does NOT need credentials
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ Apply CORS globally
app.use(cors(corsOptions));

// ✅ Handle preflight requests
app.options("*", cors(corsOptions));

// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get("/", (_req, res) => {
  res.send("🌿 LeafLine API is running...");
});

// ✅ Main routes
app.use("/api/v1", Authrouter);
app.use("/api/v1/auth/admin", AdminRouter);
app.use("/api/v1/subjects", subjectsRouter);
app.use("/api/v1/chatAi", OpenAIrouter);
app.use("/api/v1/notifications", NotificationsRouter);
app.use("/api/v1/upload", PicturesRouter);

export default app;

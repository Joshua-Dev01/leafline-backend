// src/app.ts
import express from "express";
import cors from "cors";
import router from "./routes/routes";
import subjectsRouter from "./services/Students/subjects/routes/subjects.route";
import OpenAIrouter from "./services/OpenAI/routes/openAi.route";

const app = express();

// Parse allowed origins from .env
const allowedOrigins = process.env.CLIENT_URL?.split(",") || [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        // Allow non-browser clients (like Postman, curl)
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
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
app.use("/api/v1/subjects", subjectsRouter);
app.use("/api/v1/chatAi", OpenAIrouter);

export default app;

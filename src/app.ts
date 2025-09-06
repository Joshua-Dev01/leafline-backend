import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/routes";
import path from "path";
// import createSubjectsRouter from "./services/Students/subjects/CreateSubjects/routes/CreateSubject.routes";
import subjectsRouter from "./services/Students/subjects/routes/subjects.route";

// Load env variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000", // Local dev
      "https://leaf-llne-frontend-design.vercel.app/",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // credentials: true, // Optional: If you're using cookies or sessions
  })
);

// Middlewares

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send("🌿 LeafLine API is running...");
});

app.use("/api/v1", router);
app.use("/api/v1/subjects", subjectsRouter);

export default app;

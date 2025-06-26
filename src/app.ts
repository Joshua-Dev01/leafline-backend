import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/routes";
import path from "path";

// Load env variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const app = express();


app.use(cors({
  origin: process.env.CLIENT_URL, // e.g., http://localhost:3000
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
// Middlewares

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send("🌿 LeafLine API is running...");
});

app.use("/api/v1", router);

export default app;

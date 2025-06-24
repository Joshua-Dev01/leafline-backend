import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/routes";
import path from "path";

// Load env variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send("🌿 LeafLine API is running...");
});

app.use("/api/v1", router);

export default app;

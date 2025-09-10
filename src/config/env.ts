import dotenv from "dotenv";
import path from "path";

// Load .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  PORT: process.env.PORT || "5000",
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",

  MONGO_URI: process.env.MONGO_URI as string,
  JWT_SECRET: process.env.JWT_SECRET as string,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY as string,
  RESEND_API_KEY: process.env.RESEND_API_KEY as string,
};

// Fail fast if something important is missing
if (!env.MONGO_URI) throw new Error("❌ Missing MONGO_URI in .env");
if (!env.JWT_SECRET) throw new Error("❌ Missing JWT_SECRET in .env");
if (!env.OPENAI_API_KEY) throw new Error("❌ Missing OPENAI_API_KEY in .env");

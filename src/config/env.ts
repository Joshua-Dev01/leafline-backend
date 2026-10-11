import dotenv from "dotenv";
import path from "path";

// Load .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// 🌍 Auto-detect environment and set default client URLs
const DEFAULT_CLIENT_URLS =
  process.env.NODE_ENV === "production"
    ? ["https://leafline.vercel.app"] // your production frontend
    : ["http://localhost:3000"]; // local dev frontend

// Allow overrides via .env (comma-separated)
const CLIENT_URLS = process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(",").map((url) => url.trim())
  : DEFAULT_CLIENT_URLS;

export const env = {
  PORT: process.env.PORT || "5000",
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URLS, // ✅ Array of client URLs

  MONGO_URI: process.env.MONGO_URI as string,
  JWT_SECRET: process.env.JWT_SECRET as string,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY as string,
  RESEND_API_KEY: process.env.RESEND_API_KEY as string,

  // Optional: point the Library AI at another OpenAI-compatible provider
  // (e.g. Groq). When LIBRARY_AI_API_KEY is empty, OpenAI is used as before.
  LIBRARY_AI_API_KEY: process.env.LIBRARY_AI_API_KEY || "",
  LIBRARY_AI_BASE_URL: process.env.LIBRARY_AI_BASE_URL || "",
  LIBRARY_AI_MODEL: process.env.LIBRARY_AI_MODEL || "",
  LIBRARY_AI_MAX_CHARS: Number(process.env.LIBRARY_AI_MAX_CHARS) || 0,
  // Let the AI approve/reject new Library uploads. Set LIBRARY_AI_REVIEW=false to turn off.
  LIBRARY_AI_REVIEW: process.env.LIBRARY_AI_REVIEW !== "false",
};

// ✅ Fail fast for required envs
if (!env.MONGO_URI) throw new Error("❌ Missing MONGO_URI in .env");
if (!env.JWT_SECRET) throw new Error("❌ Missing JWT_SECRET in .env");
if (!env.OPENAI_API_KEY) throw new Error("❌ Missing OPENAI_API_KEY in .env");
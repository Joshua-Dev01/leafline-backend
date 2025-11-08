import dotenv from "dotenv";
import path from "path";

// Load .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// 🌍 Auto-detect environment and set default client URLs
const DEFAULT_CLIENT_URLS =
  process.env.NODE_ENV === "production"
    ? ["leaf-llne-frontend-design.vercel.app"] // your production frontend
    : ["localhost:3000"]; // local dev frontends

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
};

// ✅ Fail fast for required envs
if (!env.MONGO_URI) throw new Error("❌ Missing MONGO_URI in .env");
if (!env.JWT_SECRET) throw new Error("❌ Missing JWT_SECRET in .env");
if (!env.OPENAI_API_KEY) throw new Error("❌ Missing OPENAI_API_KEY in .env");

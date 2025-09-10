// src/config/openai.ts
import OpenAI from "openai";
import { env } from "./env";
// ✅ use central env loader

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

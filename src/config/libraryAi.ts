// src/config/libraryAi.ts
// The AI client used by the Library (ask / quiz).
//
// Default: OpenAI (same client as the rest of the app).
// Free alternative: set LIBRARY_AI_API_KEY (+ BASE_URL + MODEL) in .env to use
// any OpenAI-compatible provider such as Groq. Other features are unaffected.
import OpenAI from "openai";
import { env } from "./env";
import { openai } from "./openai";

const usingCustomProvider = !!env.LIBRARY_AI_API_KEY;

export const libraryAi: OpenAI = usingCustomProvider
  ? new OpenAI({
      apiKey: env.LIBRARY_AI_API_KEY,
      baseURL: env.LIBRARY_AI_BASE_URL || undefined,
    })
  : openai;

export const LIBRARY_AI_MODEL =
  env.LIBRARY_AI_MODEL || (usingCustomProvider ? "openai/gpt-oss-120b" : "gpt-4o-mini");

// Free tiers cap tokens per request/minute, so send less of a long document
// to them. OpenAI keeps the original, larger limit.
export const LIBRARY_AI_MAX_CHARS =
  env.LIBRARY_AI_MAX_CHARS || (usingCustomProvider ? 12_000 : 60_000);

/** A clear, student-safe message for a failed AI call (details go to the log). */
export const aiFailureMessage = (err: any, fallback: string): string => {
  const status = err?.status;
  if (status === 429)
    return "The AI is busy or has hit its usage limit. Please wait a minute and try again.";
  if (status === 404)
    return "The AI model LeafLine is set to use is no longer available. Please let an admin know.";
  if (status === 413)
    return "This document is too large for the AI to read in one go. Try a shorter document.";
  return fallback;
};

console.log(
  `[Library AI] provider: ${usingCustomProvider ? env.LIBRARY_AI_BASE_URL || "custom" : "OpenAI"}, model: ${LIBRARY_AI_MODEL}`
);
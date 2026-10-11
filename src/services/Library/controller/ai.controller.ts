import { Request, Response } from "express";
import {
  aiFailureMessage,
  LIBRARY_AI_MAX_CHARS,
  LIBRARY_AI_MODEL,
  libraryAi,
} from "../../../config/libraryAi";
import { LibraryResource } from "../models/resource.model";
import { canViewResource } from "./resource.controller";


/** Loads a visible resource plus its extracted text, or sends the error response. */
const loadResourceText = async (req: Request, res: Response) => {
  const resource = await LibraryResource.findById(req.params.id).select(
    "+extractedText title courseCode subject status uploaderId"
  );
  if (!resource || !canViewResource(resource, req)) {
    res.status(404).json({ message: "Resource not found" });
    return null;
  }
  if (!resource.extractedText || resource.extractedText.trim().length < 50) {
    res.status(422).json({
      message:
        "AI isn't available for this resource — it has no readable text (it may be a scanned PDF or an image).",
    });
    return null;
  }
  return { resource, text: resource.extractedText.slice(0, LIBRARY_AI_MAX_CHARS) };
};

const describe = (r: { title: string; courseCode?: string; subject?: string }) =>
  [r.title, r.courseCode, r.subject].filter(Boolean).join(" · ");

// POST /library/resources/:id/ai/ask   { question }
export const askAboutResource = async (req: Request, res: Response) => {
  const loaded = await loadResourceText(req, res);
  if (!loaded) return;
  const { resource, text } = loaded;

  try {
    const completion = await libraryAi.chat.completions.create({
      model: LIBRARY_AI_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are LeafLine's study assistant. Answer the student's question using ONLY the document below. " +
            "If the document doesn't contain the answer, say so plainly instead of guessing. " +
            "Be clear and concise; use short lists or steps when it helps.\n\n" +
            `Document: ${describe(resource)}\n---\n${text}`,
        },
        { role: "user", content: req.body.question },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) throw new Error("Empty AI response");
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("[Library] AI ask failed:", err);
    return res.status(503).json({
      message: aiFailureMessage(
        err,
        "The AI assistant is unavailable right now. Try again shortly."
      ),
    });
  }
};

interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

const isValidQuestion = (q: any): q is QuizQuestion =>
  q &&
  typeof q.question === "string" &&
  Array.isArray(q.options) &&
  q.options.length === 4 &&
  q.options.every((o: unknown) => typeof o === "string") &&
  Number.isInteger(q.answerIndex) &&
  q.answerIndex >= 0 &&
  q.answerIndex < 4 &&
  typeof q.explanation === "string";

// POST /library/resources/:id/ai/quiz   { count? }
export const generateResourceQuiz = async (req: Request, res: Response) => {
  const loaded = await loadResourceText(req, res);
  if (!loaded) return;
  const { resource, text } = loaded;
  const count = Number(req.body.count) || 5;

  try {
    const completion = await libraryAi.chat.completions.create({
      model: LIBRARY_AI_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `Create a ${count}-question multiple-choice quiz from the document below to help a student revise. ` +
            "Base every question strictly on the document. Each question has exactly 4 options and one correct answer. " +
            'Respond with JSON only: {"questions":[{"question":string,"options":[string,string,string,string],"answerIndex":0-3,"explanation":string}]}.\n\n' +
            `Document: ${describe(resource)}\n---\n${text}`,
        },
        { role: "user", content: `Generate ${count} questions.` },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    const parsed = raw ? JSON.parse(raw) : null;
    const questions: QuizQuestion[] = (parsed?.questions ?? []).filter(isValidQuestion);
    if (!questions.length) throw new Error("No valid questions generated");

    return res.status(200).json({
      title: `Quiz: ${resource.title}`,
      resourceId: resource._id,
      questions,
    });
  } catch (err) {
    console.error("[Library] AI quiz failed:", err);
    return res.status(503).json({
      message: aiFailureMessage(err, "Couldn't generate a quiz right now. Try again shortly."),
    });
  }
};
// // src/controllers/chatController.ts
// import { Request, Response } from "express";
// import Chat from "../models/chat";
// import { openai } from "../../../config/openai";
// export const sendMessage = async (req: Request, res: Response) => {
//   try {
//     const { userId, message } = req.body;

//     let chat = await Chat.findOne({ userId });
//     if (!chat) {
//       chat = new Chat({ userId, messages: [] });
//     }

//     // Add user message
//     chat.messages.push({
//       role: "user",
//       content: message,
//       timestamp: new Date(),
//     });

//     // Send conversation to OpenAI
//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: chat.messages.map((m) => ({
//         role: m.role,
//         content: m.content,
//       })),
//     });

//     const reply = response.choices[0].message?.content || "No reply";

//     // Save assistant reply
//     chat.messages.push({
//       role: "assistant",
//       content: reply,
//       timestamp: new Date(),
//     });

//     await chat.save();

//     res.json({ reply, history: chat.messages });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Chat failed" });
//   }
// };


// src/services/OpenAI/controllers/openAi.controller.ts
import { openai } from "../../../config/openai";
import { Request, Response } from "express";
import Chat from "../models/chat";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body;

    let assistantMessage: string;

    try {
      // 🔹 Try calling OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
      });

      assistantMessage = completion.choices[0].message.content || "No response";
    } catch (err) {
      console.warn("⚠️ OpenAI quota exceeded. Saving dummy response.");
      assistantMessage = "This is a dummy assistant reply (OpenAI quota exceeded).";
    }

    // 🔹 Save to MongoDB
    let chat = await Chat.findOne({ userId });

    if (!chat) {
      chat = new Chat({ userId, messages: [] });
    }

    chat.messages.push({ role: "user", content: message, timestamp: new Date() });
    chat.messages.push({ role: "assistant", content: assistantMessage, timestamp: new Date() });

    await chat.save();

    res.status(200).json({ reply: assistantMessage });
  } catch (error) {
    console.error("❌ Error in sendMessage:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};


// get History
export const getHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    console.log("📌 Incoming userId:", userId);

    const chat = await Chat.findOne({ userId });

    if (!chat) {
      console.log("⚠️ No chat found for this user");
      return res.status(404).json({ history: [] });
    }

    res.status(200).json({ history: chat.messages });
  } catch (error) {
    console.error("❌ Error fetching history:", error);
    res.status(500).json({ error: "Could not fetch history" });
  }
};


// delete histroy
export const deleteOpenAiChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: "UserId is required" });
      return;
    }

    const result = await Chat.findOneAndDelete({ userId });

    if (!result) {
      res.status(404).json({ message: "No chat history found to delete" });
      return;
    }

    res.status(200).json({ message: "Chat history deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting chat history:", error);
    res.status(500).json({ error: "Could not delete history" });
  }
};

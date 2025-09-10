// src/models/Chat.ts
import mongoose, { Schema, Document } from "mongoose";

interface IMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface IChat extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  messages: IMessage[];
}

const chatSchema = new Schema<IChat>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  messages: [
    {
      role: { type: String, enum: ["user", "assistant", "system"], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

export default mongoose.model<IChat>("Chat", chatSchema);

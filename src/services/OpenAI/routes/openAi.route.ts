// src/routes/chatRoutes.ts
import express from "express";
import { protect } from "../../../auth/middleware/protect";
import {  deleteOpenAiChatHistory, getHistory, sendMessage } from "../controller/chatController";
import catchAsync from "../../../auth/utils/catchAsync";

const OpenAIrouter = express.Router();

OpenAIrouter.post("/", catchAsync(protect), sendMessage);     
OpenAIrouter.get("/history/:userId", catchAsync(protect),  catchAsync(getHistory));  
OpenAIrouter.delete("/history/:userId", catchAsync(protect),  catchAsync(deleteOpenAiChatHistory));  

export default OpenAIrouter;

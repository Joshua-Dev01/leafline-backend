"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blog = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Define the comment schema
const commentSchema = new mongoose_1.default.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    replies: [
        {
            user: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
        },
    ],
}, { timestamps: true });
const blogSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    coverImage: { type: String },
    category: { type: String },
    author: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    likes: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],
}, { timestamps: true });
exports.Blog = mongoose_1.default.model("Blog", blogSchema);

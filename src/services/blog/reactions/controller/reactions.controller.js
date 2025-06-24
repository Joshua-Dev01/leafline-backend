"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addComment = exports.toggleLike = void 0;
const blog_model_1 = require("../../createBlog/models/blog.model");
const mongoose_1 = require("mongoose");
// ✅ Toggle Like
const toggleLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blog = yield blog_model_1.Blog.findById(req.params.id);
        if (!blog)
            return res.status(404).json({ message: "Blog not found" });
        const userId = new mongoose_1.Types.ObjectId(req.user._id);
        const alreadyLiked = blog.likes.some((id) => id.toString() === userId.toString());
        if (alreadyLiked) {
            blog.likes = blog.likes.filter((id) => id.toString() !== userId.toString());
        }
        else {
            blog.likes.push(userId);
        }
        yield blog.save();
        res.status(200).json({
            message: alreadyLiked ? "Unliked" : "Liked",
            likesCount: blog.likes.length,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error liking the post" });
    }
});
exports.toggleLike = toggleLike;
// ✅ Add Comment
const addComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text } = req.body;
        if (!text)
            return res.status(400).json({ message: "Comment text is required" });
        const blog = yield blog_model_1.Blog.findById(req.params.id);
        if (!blog)
            return res.status(404).json({ message: "Blog not found" });
        blog.comments.push({
            user: req.user._id,
            text,
        });
        yield blog.save();
        res.status(201).json({
            message: "Comment added",
            comments: blog.comments,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error adding comment" });
    }
});
exports.addComment = addComment;

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
exports.replyToComment = void 0;
const blog_model_1 = require("../../createBlog/models/blog.model");
// ✅ Reply to a comment
const replyToComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { text } = req.body;
    const { id: blogId, commentId } = req.params;
    if (!text)
        return res.status(400).json({ message: "Reply text is required" });
    const blog = yield blog_model_1.Blog.findById(blogId);
    if (!blog)
        return res.status(404).json({ message: "Blog not found" });
    const comment = blog.comments.id(commentId);
    if (!comment)
        return res.status(404).json({ message: "Comment not found" });
    comment.replies.push({
        user: req.user._id,
        text,
    });
    yield blog.save();
    res.status(201).json({ message: "Reply added", replies: comment.replies });
});
exports.replyToComment = replyToComment;

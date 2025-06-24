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
exports.searchBlogs = void 0;
const blog_model_1 = require("../../createBlog/models/blog.model");
const searchBlogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query missing" });
    }
    const blogs = yield blog_model_1.Blog.find({
        $or: [
            { title: { $regex: q, $options: "i" } },
            { content: { $regex: q, $options: "i" } }
        ]
    }).populate("author", "name email");
    res.status(200).json(blogs);
});
exports.searchBlogs = searchBlogs;

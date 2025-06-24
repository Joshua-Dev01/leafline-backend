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
exports.getBlogById = exports.getAllBlogs = void 0;
const blog_model_1 = require("../../createBlog/models/blog.model");
const getAllBlogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const blogs = yield blog_model_1.Blog.find(filter)
        .populate("author", "name email")
        .sort({ createdAt: -1 });
    res.status(200).json(blogs);
});
exports.getAllBlogs = getAllBlogs;
const getBlogById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const blog = yield blog_model_1.Blog.findById(req.params.id).populate("author", "name email");
    if (!blog)
        return res.status(404).json({ message: "Blog not found" });
    res.status(200).json(blog);
});
exports.getBlogById = getBlogById;

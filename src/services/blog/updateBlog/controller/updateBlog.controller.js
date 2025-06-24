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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBlog = void 0;
const slugify_1 = __importDefault(require("slugify"));
const blog_model_1 = require("../../createBlog/models/blog.model");
const updateBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, content, coverImage, category } = req.body;
    const blog = yield blog_model_1.Blog.findById(req.params.id);
    if (!blog)
        return res.status(404).json({ message: "Blog not found" });
    if (title) {
        blog.title = title;
        blog.slug = (0, slugify_1.default)(title, { lower: true, strict: true });
    }
    if (content)
        blog.content = content;
    if (coverImage)
        blog.coverImage = coverImage;
    if (category)
        blog.category = category;
    yield blog.save();
    res.status(200).json(blog);
});
exports.updateBlog = updateBlog;

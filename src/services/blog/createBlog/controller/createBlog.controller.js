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
exports.createBlog = void 0;
const blog_model_1 = require("../models/blog.model");
const slugify_1 = __importDefault(require("slugify"));
const createBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { title, content, coverImage, category } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
    }
    const slug = (0, slugify_1.default)(title, { lower: true, strict: true });
    const blog = yield blog_model_1.Blog.create({
        title,
        slug,
        content,
        coverImage,
        category,
        author: userId,
    });
    res.status(201).json(blog);
});
exports.createBlog = createBlog;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const catchAsync_1 = __importDefault(require("../../../../auth/utils/catchAsync"));
const searchBlog_controller_1 = require("../../searchBlog/controller/searchBlog.controller");
const searchBlogRouter = express_1.default.Router();
searchBlogRouter.get("/search/query", (0, catchAsync_1.default)(searchBlog_controller_1.searchBlogs));
exports.default = searchBlogRouter;

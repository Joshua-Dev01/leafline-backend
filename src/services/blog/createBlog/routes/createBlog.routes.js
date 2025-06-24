"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const protect_1 = require("../../../../auth/middleware/protect");
const checkAdmin_middleware_1 = require("../../../admin/middleware/checkAdmin.middleware");
const createBlog_controller_1 = require("../controller/createBlog.controller");
const catchAsync_1 = __importDefault(require("../../../../auth/utils/catchAsync"));
const createBlogRouter = express_1.default.Router();
createBlogRouter.post("/create-blog", (0, catchAsync_1.default)(protect_1.protect), (0, catchAsync_1.default)(checkAdmin_middleware_1.checkAdmin), (0, catchAsync_1.default)(createBlog_controller_1.createBlog));
exports.default = createBlogRouter;

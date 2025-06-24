"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const catchAsync_1 = __importDefault(require("../../../../auth/utils/catchAsync"));
const checkAdmin_middleware_1 = require("../../../admin/middleware/checkAdmin.middleware");
const protect_1 = require("../../../../auth/middleware/protect");
const updateBlog_controller_1 = require("../controller/updateBlog.controller");
const updateBlogRouter = express_1.default.Router();
updateBlogRouter.put("/:id", (0, catchAsync_1.default)(protect_1.protect), (0, catchAsync_1.default)(checkAdmin_middleware_1.checkAdmin), (0, catchAsync_1.default)(updateBlog_controller_1.updateBlog));
exports.default = updateBlogRouter;

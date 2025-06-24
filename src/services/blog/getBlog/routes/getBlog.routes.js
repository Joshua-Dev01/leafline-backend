"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const catchAsync_1 = __importDefault(require("../../../../auth/utils/catchAsync"));
const getBlog_controller_1 = require("../controller/getBlog.controller");
const getBlogRouter = express_1.default.Router();
getBlogRouter.get("/get-blog", (0, catchAsync_1.default)(getBlog_controller_1.getAllBlogs));
getBlogRouter.get("/:id", (0, catchAsync_1.default)(getBlog_controller_1.getBlogById));
exports.default = getBlogRouter;

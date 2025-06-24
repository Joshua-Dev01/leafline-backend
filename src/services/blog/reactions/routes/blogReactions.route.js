"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const catchAsync_1 = __importDefault(require("../../../../auth/utils/catchAsync"));
const reactions_controller_1 = require("../controller/reactions.controller");
const protect_1 = require("../../../../auth/middleware/protect");
const replyComments_controller_1 = require("../controller/replyComments.controller");
const deleteComment_controller_1 = require("../controller/deleteComment.controller");
const reactionBlogRouter = express_1.default.Router();
reactionBlogRouter.post("/:id/like", (0, catchAsync_1.default)(protect_1.protect), (0, catchAsync_1.default)(reactions_controller_1.toggleLike));
reactionBlogRouter.post("/:id/comment", (0, catchAsync_1.default)(protect_1.protect), (0, catchAsync_1.default)(reactions_controller_1.addComment));
reactionBlogRouter.post("/:id/comment/:commentId/reply", (0, catchAsync_1.default)(protect_1.protect), (0, catchAsync_1.default)(replyComments_controller_1.replyToComment));
reactionBlogRouter.delete("/:id/comment/:commentId", (0, catchAsync_1.default)(protect_1.protect), (0, catchAsync_1.default)(deleteComment_controller_1.deleteComment));
exports.default = reactionBlogRouter;

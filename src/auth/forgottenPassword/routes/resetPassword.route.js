"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const forgotPassword_controller_1 = require("../controller/forgotPassword.controller");
const resetPassword_controller_1 = require("../controller/resetPassword.controller");
const resetPasswordRouter = express_1.default.Router();
resetPasswordRouter.post("/forgot-password", (0, catchAsync_1.default)(forgotPassword_controller_1.forgotPassword));
resetPasswordRouter.post("/reset-password", (0, catchAsync_1.default)(resetPassword_controller_1.resetPassword));
exports.default = resetPasswordRouter;

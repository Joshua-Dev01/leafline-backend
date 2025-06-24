"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const protect_1 = require("../../middleware/protect");
const profile_controller_1 = require("../controller/profile.controller");
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const profileRouter = express_1.default.Router();
profileRouter.get("/profile", (0, catchAsync_1.default)(protect_1.protect), (0, catchAsync_1.default)(profile_controller_1.getProfile));
exports.default = profileRouter;

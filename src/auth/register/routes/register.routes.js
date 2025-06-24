"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const register_controller_1 = require("../controllers/register.controller");
const registerRouter = express_1.default.Router();
registerRouter.post("/register", (0, catchAsync_1.default)(register_controller_1.register));
exports.default = registerRouter;

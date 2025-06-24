"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const login_controller_1 = require("../controllers/login.controller");
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const loginRouter = express_1.default.Router();
loginRouter.post("/login", (0, catchAsync_1.default)(login_controller_1.login));
exports.default = loginRouter;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const protect_1 = require("../../middleware/protect");
const deleteAccount_controller_1 = require("../controller/deleteAccount.controller");
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const deleteAccountRouter = express_1.default.Router();
deleteAccountRouter.delete("/delete-account", (0, catchAsync_1.default)(protect_1.protect), (0, catchAsync_1.default)(deleteAccount_controller_1.deleteAccount));
exports.default = deleteAccountRouter;

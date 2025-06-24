"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const protect_1 = require("../../middleware/protect");
const updateProfile_controller_1 = require("../controller/updateProfile.controller");
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const updateProfileRouter = express_1.default.Router();
updateProfileRouter.put("/update-profile", (0, catchAsync_1.default)(protect_1.protect), (0, catchAsync_1.default)(updateProfile_controller_1.updateProfile));
exports.default = updateProfileRouter;

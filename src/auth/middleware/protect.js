"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
        try {
            if (!token || !process.env.JWT_SECRET) {
                return res
                    .status(401)
                    .json({ message: "Not authorized, token or secret missing" });
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = yield user_model_1.User.findById(decoded.id).select("name email role");
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }
            req.user = {
                id: user._id.toString(), // ✅ required for compatibility
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            };
            return next();
        }
        catch (err) {
            return res.status(401).json({ message: "Token invalid or expired" });
        }
    }
    return res.status(401).json({ message: "Not authorized, no token" });
});
exports.protect = protect;

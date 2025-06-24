"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResetToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const generateToken = (id, role) => {
    return jsonwebtoken_1.default.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
};
exports.generateToken = generateToken;
const generateResetToken = () => {
    const resetToken = crypto_1.default.randomBytes(32).toString("hex");
    const hashedToken = crypto_1.default
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    return { resetToken, hashedToken };
};
exports.generateResetToken = generateResetToken;

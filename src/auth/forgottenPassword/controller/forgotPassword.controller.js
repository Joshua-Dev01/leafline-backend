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
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgotPassword = void 0;
const user_model_1 = require("../../models/user.model");
const sendEmail_1 = require("../../utils/sendEmail");
const generateToken_1 = require("../../utils/generateToken");
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    console.log("📨 Forgot Password request for:", email);
    const user = yield user_model_1.User.findOne({ email });
    if (!user) {
        console.log("❌ User not found");
        return res.status(404).json({ message: "User not found" });
    }
    const { resetToken, hashedToken } = (0, generateToken_1.generateResetToken)();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    yield user.save();
    const resetURL = `http://localhost:3000/reset-password?token=${resetToken}`;
    const message = `
    <h1>Password Reset</h1>
    <p>Click the link below to reset your password. This link will expire in 15 minutes.</p>
    <a href="${resetURL}">${resetURL}</a>
  `;
    console.log("🔗 Sending email with reset URL:", resetURL);
    yield (0, sendEmail_1.sendEmail)(user.email, "LeafLine Password Reset", message);
    res.status(200).json({ message: "Password reset email sent" });
});
exports.forgotPassword = forgotPassword;

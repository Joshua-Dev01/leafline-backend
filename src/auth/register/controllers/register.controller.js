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
exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_model_1 = require("../../models/user.model");
const generateToken_1 = require("../../utils/generateToken");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password } = req.body;
        const exists = yield user_model_1.User.findOne({ email });
        if (exists)
            return res.status(400).json({ message: "Email already registered" });
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const user = yield user_model_1.User.create({ name, email, password: hashedPassword });
        const token = (0, generateToken_1.generateToken)(user._id.toString(), user.role);
        res
            .status(201)
            .json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            token,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Registration failed", error: err });
    }
});
exports.register = register;

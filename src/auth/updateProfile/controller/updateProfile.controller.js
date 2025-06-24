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
exports.updateProfile = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_model_1 = require("../../models/user.model");
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_model_1.User.findById(req.user._id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const { name, email, password } = req.body;
        if (name)
            user.name = name;
        if (email)
            user.email = email;
        if (password) {
            user.password = yield bcryptjs_1.default.hash(password, 10);
        }
        const updated = yield user.save();
        res.status(200).json({
            user: {
                id: updated._id,
                name: updated.name,
                email: updated.email,
                role: updated.role,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: "Update failed", error: err });
    }
});
exports.updateProfile = updateProfile;

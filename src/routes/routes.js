"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("../auth/routes/auth.routes"));
const blog_route_1 = __importDefault(require("../services/blog/routes/blog.route"));
const router = express_1.default.Router();
// /auth routes
router.use("/auth", auth_routes_1.default);
router.use("/blog", blog_route_1.default);
exports.default = router;

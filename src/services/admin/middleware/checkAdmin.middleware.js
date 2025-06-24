"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAdmin = void 0;
const checkAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied: Admins only" });
    }
    next();
};
exports.checkAdmin = checkAdmin;

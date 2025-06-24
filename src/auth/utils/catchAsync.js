"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/services/auth/utils/catchAsync.ts
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.default = catchAsync;

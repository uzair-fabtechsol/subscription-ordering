"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
// utils/AppError.ts
class AppError extends Error {
    constructor(message, errCode) {
        super(message);
        this.errCode = errCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;

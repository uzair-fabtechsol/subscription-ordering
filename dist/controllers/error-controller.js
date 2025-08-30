"use strict";
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
const AppError_1 = require("../utils/AppError");
const mongodb_1 = require("mongodb");
const globalErrorHandler = (err, req, res) => {
    const isDev = process.env.NODE_ENV === "development";
    if (err instanceof AppError_1.AppError) {
        return res.status(err.errCode).json({ status: "fail", message: err.message });
    }
    if (err instanceof mongodb_1.MongoServerError && err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({ status: "fail", message: `${field} already exists` });
    }
    if (isValidationError(err)) {
        return res.status(400).json({ status: "fail", message: "Validation failed", details: Object.values(err.errors).map(e => e.message) });
    }
    if (isCastError(err)) {
        return res.status(400).json({ status: "fail", message: `Invalid ${err.kind}: ${err.value}` });
    }
    if (isJWTError(err)) {
        return res.status(401).json({ status: "fail", message: err.name === "JsonWebTokenError" ? "Invalid token" : "Token expired" });
    }
    return res.status(500).json({ status: "error", message: "Server error", ...(isDev && err instanceof Error && { details: err.message }) });
};
exports.globalErrorHandler = globalErrorHandler;
const isValidationError = (err) => {
    return !!err && typeof err === "object" && "errors" in err;
};
const isCastError = (err) => {
    return !!err && typeof err === "object" && "kind" in err && "value" in err;
};
const isJWTError = (err) => {
    return !!err && typeof err === "object" && "name" in err && (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError");
};

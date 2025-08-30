/* eslint-disable */

import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { MongoServerError } from "mongodb";

export const globalErrorHandler = (err: unknown, req: Request, res: Response) => {
  const isDev = process.env.NODE_ENV === "development";

  if (err instanceof AppError) {
    return res.status(err.errCode).json({ status: "fail", message: err.message });
  }

  if (err instanceof MongoServerError && err.code === 11000) {
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

const isValidationError = (err: unknown): err is { errors: Record<string, { message: string }> } => {
  return !!err && typeof err === "object" && "errors" in err;
};

const isCastError = (err: unknown): err is { kind: string; value: any } => {
  return !!err && typeof err === "object" && "kind" in err && "value" in err;
};

const isJWTError = (err: unknown): err is { name: string } => {
  return !!err && typeof err === "object" && "name" in err && (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError");
};
/* eslint-disable */

import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { MongoServerError } from "mongodb";
import dotenv from "dotenv";
import { IResponseObject } from "@/types/response-object-types";
dotenv.config();

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response
) => {
  const isDev = process.env.NODE_ENV === "development";

  if (err instanceof AppError) {
    const responseObject: IResponseObject = {
      status: "fail",
      message: err.message,
    };
    return res.status(err.errCode).json(responseObject);
  }

  if (err instanceof MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const responseObject: IResponseObject = {
      status: "fail",
      message: `${field} already exists`,
    };
    return res.status(409).json(responseObject);
  }

  if (isValidationError(err)) {
    const responseObject: IResponseObject = {
      status: "fail",
      message: "Validation failed",
      data: {
        details: Object.values(err.errors).map((e) => e.message),
      },
    };
    return res.status(400).json(responseObject);
  }

  if (isCastError(err)) {
    const responseObject: IResponseObject = {
      status: "fail",
      message: `Invalid ${err.kind}: ${err.value}`,
    };
    return res.status(400).json(responseObject);
  }

  if (isJWTError(err)) {
    const responseObject: IResponseObject = {
      status: "fail",
      message:
        err.name === "JsonWebTokenError" ? "Invalid token" : "Token expired",
    };
    return res.status(401).json(responseObject);
  }

  return res.status(500).json({
    status: "error",
    message: "Server error",
    ...(isDev && err instanceof Error && { details: err.message }),
  });
};

const isValidationError = (
  err: unknown
): err is { errors: Record<string, { message: string }> } => {
  return !!err && typeof err === "object" && "errors" in err;
};

const isCastError = (err: unknown): err is { kind: string; value: any } => {
  return !!err && typeof err === "object" && "kind" in err && "value" in err;
};

const isJWTError = (err: unknown): err is { name: string } => {
  return (
    !!err &&
    typeof err === "object" &&
    "name" in err &&
    (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")
  );
};

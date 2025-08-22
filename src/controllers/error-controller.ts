/* eslint-disable */

import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { MongoServerError } from "mongodb";

interface ErrorResponse {
  status: "error" | "fail";
  message: string;
  details?: any;
  stack?: string;
}

interface ValidationError {
  errors: Record<string, { message: string; kind?: string; path?: string }>;
}

interface CastError {
  path: string;
  value: any;
  kind: string;
}

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response
) => {
  console.log("Global error handler triggered");

  // Development vs Production error details
  const isDevelopment = process.env.NODE_ENV === "development";

  // Handle known AppError
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      status: "fail",
      message: err.message,
    };

    if (isDevelopment && err.stack) {
      response.stack = err.stack;
    }

    return res.status(err.errCode).json(response);
  }

  // Handle MongoDB errors
  if (err instanceof MongoServerError) {
    return handleMongoError(err, res, isDevelopment);
  }

  // Handle Mongoose Validation Errors
  if (isValidationError(err)) {
    return handleValidationError(err, res, isDevelopment);
  }

  // Handle Mongoose Cast Errors (Invalid ObjectId, etc.)
  if (isCastError(err)) {
    return handleCastError(err, res, isDevelopment);
  }

  // Handle JWT Errors
  if (isJWTError(err)) {
    return handleJWTError(err, res, isDevelopment);
  }

  // Handle Syntax Errors (JSON parsing, etc.)
  if (err instanceof SyntaxError) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid JSON format in request body",
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    });
  }

  // Handle Type Errors
  if (err instanceof TypeError) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid data type provided",
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    });
  }

  // Handle Reference Errors
  if (err instanceof ReferenceError) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error - undefined reference",
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    });
  }

  // Handle unknown errors
  console.error("Unexpected error:", err);

  const response: ErrorResponse = {
    status: "error",
    message: "Something went wrong on our end",
  };

  if (isDevelopment) {
    response.details = err;
    if (err instanceof Error) {
      response.stack = err.stack;
    }
  }

  return res.status(500).json(response);
};

// MongoDB Error Handler
const handleMongoError = (
  err: MongoServerError,
  res: Response,
  isDevelopment: boolean
) => {
  switch (err.code) {
    case 11000: // Duplicate key error
      const duplicatedFields = Object.keys(err.keyValue || {});
      const fieldMessages = duplicatedFields
        .map((field) => {
          const value = err.keyValue?.[field];
          return `${field}: '${value}' already exists`;
        })
        .join(", ");

      return res.status(409).json({
        status: "fail",
        message: `Duplicate entry found. ${fieldMessages}`,
        ...(isDevelopment && { details: err.keyValue }),
      });

    case 121: // Document validation failed
      return res.status(400).json({
        status: "fail",
        message: "Document validation failed",
        ...(isDevelopment && { details: err.errInfo }),
      });

    default:
      return res.status(500).json({
        status: "error",
        message: "Database operation failed",
        ...(isDevelopment && { details: err.message }),
      });
  }
};

// Mongoose Validation Error Handler
const handleValidationError = (
  err: ValidationError,
  res: Response,
  isDevelopment: boolean
) => {
  const errors = Object.values(err.errors).map((error) => {
    if (error.kind === "required") {
      return `${error.path} is required`;
    }
    if (error.kind === "minlength") {
      return `${error.path} is too short`;
    }
    if (error.kind === "maxlength") {
      return `${error.path} is too long`;
    }
    if (error.kind === "enum") {
      return `${error.path} has an invalid value`;
    }
    return error.message;
  });

  return res.status(400).json({
    status: "fail",
    message: "Validation failed",
    details: errors,
    ...(isDevelopment && { fullError: err }),
  });
};

// Mongoose Cast Error Handler (Invalid ObjectId, etc.)
const handleCastError = (
  err: CastError,
  res: Response,
  isDevelopment: boolean
) => {
  let message = "Invalid data format";

  if (err.kind === "ObjectId") {
    message = `Invalid ID format: ${err.value}`;
  } else if (err.kind === "Number") {
    message = `Invalid number format for ${err.path}: ${err.value}`;
  } else if (err.kind === "Date") {
    message = `Invalid date format for ${err.path}: ${err.value}`;
  }

  return res.status(400).json({
    status: "fail",
    message,
    ...(isDevelopment && {
      details: { path: err.path, value: err.value, kind: err.kind },
    }),
  });
};

// JWT Error Handler
const handleJWTError = (err: any, res: Response, isDevelopment: boolean) => {
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      status: "fail",
      message: "Invalid authentication token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      status: "fail",
      message: "Authentication token has expired",
    });
  }

  return res.status(401).json({
    status: "fail",
    message: "Authentication failed",
    ...(isDevelopment && { details: err.message }),
  });
};

// Multer Error Handler (File upload errors)
const handleMulterError = (err: any, res: Response, isDevelopment: boolean) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      status: "fail",
      message: "File size exceeds the maximum allowed limit",
    });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      status: "fail",
      message: "Too many files uploaded",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      status: "fail",
      message: "Unexpected file field",
    });
  }

  return res.status(400).json({
    status: "fail",
    message: "File upload failed",
    ...(isDevelopment && { details: err.message }),
  });
};

// Type Guards
const isValidationError = (err: unknown): err is ValidationError => {
  return typeof err === "object" && err !== null && "errors" in err;
};

const isCastError = (err: unknown): err is CastError => {
  return (
    typeof err === "object" &&
    err !== null &&
    "path" in err &&
    "value" in err &&
    "kind" in err
  );
};

const isJWTError = (err: unknown): err is { name: string; message: string } => {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")
  );
};

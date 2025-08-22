// utils/AppError.ts
export class AppError extends Error {
  public readonly errCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, errCode: number) {
    super(message);

    this.errCode = errCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = (err as AppError).statusCode || 500;
  const message = err.message || "Internal server error";

  // Mongoose duplicate key error
  if ((err as NodeJS.ErrnoException).name === "MongoServerError") {
    const mongoErr = err as NodeJS.ErrnoException & { code?: number; keyValue?: Record<string, unknown> };
    if (mongoErr.code === 11000) {
      const field = Object.keys(mongoErr.keyValue || {})[0];
      res.status(400).json({
        success: false,
        message: `${field} already exists.`,
      });
      return;
    }
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(
      (err as unknown as { errors: Record<string, { message: string }> }).errors
    ).map((e) => e.message);
    res.status(400).json({ success: false, message: messages.join(", ") });
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.error("🔴 Error:", err);
  }

  res.status(statusCode).json({ success: false, message });
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: "Route not found" });
};

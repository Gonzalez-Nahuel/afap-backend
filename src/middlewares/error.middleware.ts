import type { NextFunction, Request, Response } from "express";
import { AppError } from "@/lib/app-error";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";
const { JsonWebTokenError, TokenExpiredError } = jwt;

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AppError)
    return res.status(err.statusCode).json({
      ok: false,
      message: err.message,
    });

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return res.status(400).json({
      ok: false,
      message: "Error de validación",
      errors,
    });
  }

  if (err instanceof TokenExpiredError) {
    return res.status(401).json({
      ok: false,
      message: "El token ha expirado",
    });
  }

  if (err instanceof JsonWebTokenError) {
    return res.status(401).json({
      ok: false,
      message: "Token inválido o mal formado",
    });
  }

  console.error("error", err);
  return res.status(500).json({
    ok: false,
    message: "Internal server error",
  });
};

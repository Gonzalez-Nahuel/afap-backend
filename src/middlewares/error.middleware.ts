import type { NextFunction, Request, Response } from "express";
import { AppError } from "@/lib/app-error.js";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";
import { Prisma } from "../../generated/prisma/client.js";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";
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
      code: err.code,
      message: err.message,
    });

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return res.status(400).json({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Error de validación",
      errors,
    });
  }

  if (err instanceof TokenExpiredError) {
    return res.status(401).json({
      ok: false,
      code: "TOKEN_EXPIRED_ERROR",
      message: "El token ha expirado",
    });
  }

  if (err instanceof JsonWebTokenError) {
    return res.status(401).json({
      ok: false,
      code: "TOKEN_ERROR",
      message: "Token inválido o mal formado",
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`[PRISMA KNOWN ERROR] Código: ${err.code}`, err.message);

    if (err.code === "P2002") {
      return res.status(409).json({
        ok: false,
        code: "CONFLICT_ERROR",
        message: "El recurso que intentas crear ya existe (llave duplicada)",
      });
    }

    if (err.code === "P2025") {
      return res.status(404).json({
        ok: false,
        code: "NOT_FOUND_ERROR",
        message: "El registro solicitado no existe o no fue encontrado",
      });
    }

    return res.status(500).json({
      ok: false,
      code: "DATABASE_ERROR",
      message: "Hubo un error al procesar los datos en el servidor",
    });
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error(
      "[PRISMA CONNECTION ERROR] No se pudo conectar a la BD",
      err.message,
    );
    return res.status(503).json({
      ok: false,
      code: "DATABASE_CONNECTION_ERROR",
      message: "Servicio de base de datos temporalmente no disponible",
    });
  }

  logger.error(err, "error");

  const isDev = env.NODE_ENV === "development";

  return res.status(500).json({
    ok: false,
    code: "UNKNOWN_ERROR",
    message: "Internal server error",
    ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
  });
};

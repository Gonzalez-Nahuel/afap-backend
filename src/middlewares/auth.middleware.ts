import { AppError } from "@/lib/app-error";
import { verifyAccessToken, type UserPayload } from "@/lib/jwt";
import type { RequestHandler } from "express";

export const authMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) throw new AppError(401, "MISSING_TOKEN", "Token requerido");

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) throw new AppError(401, "INVALID_TOKEN", "Token inválido");

  const user = verifyAccessToken(token) as UserPayload;

  req.user = user;

  next();
};

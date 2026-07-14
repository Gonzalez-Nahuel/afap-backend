import { AppError } from "@/lib/app-error";
import { verifyAccessToken, type UserPayload } from "@/lib/jwt";
import type { RequestHandler } from "express";

export const authMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) throw new AppError(401, "No autorizado");

  const user = verifyAccessToken(token) as UserPayload;

  req.user = user;

  next();
};

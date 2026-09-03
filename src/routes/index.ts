import { Router } from "express";
import { AppError } from "@/lib/app-error.js";
import { asyncHandler } from "@/middlewares/async-handler.js";
import { authRouter } from "@/modules/auth/auth.routes.js";
import { authMiddleware } from "@/middlewares/auth.middleware.js";

export const router = Router();

router.use("/auth", authRouter);

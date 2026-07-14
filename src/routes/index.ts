import { Router } from "express";
import { AppError } from "@/lib/app-error";
import { asyncHandler } from "@/middlewares/async-handler";
import { authRouter } from "@/modules/auth/auth.routes";
import { authMiddleware } from "@/middlewares/auth.middleware";

export const router = Router();

router.get("/health", authMiddleware, (req, res) => {
  res.json({
    ok: true,
    message: "AFAP API running",
  });
});

router.use("/auth", authRouter);

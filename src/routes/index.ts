import { Router } from "express";
import { authRouter } from "@/modules/auth/auth.routes.js";

export const router = Router();

router.get("check", (req, res) => {
  res.json({ ok: true, message: "ok" });
});

router.use("/auth", authRouter);

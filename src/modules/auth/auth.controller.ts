import type { RequestHandler } from "express";
import { authService } from "./auth.service";

export const authController = {
  register: async (req, res) => {
    const user = await authService.registerUser(req.body);

    res.status(200).json(user);
  },
  login: async (req, res) => {
    const clientType = req.clientType;

    const { user, accessToken, refreshToken } = await authService.loginUser({
      body: req.body,
      ip: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown-client",
    });

    if (clientType === "web") {
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

      return res.status(200).json({
        user,
        accessToken,
      });
    }

    if (clientType === "mobile")
      return res.status(200).json({
        user,
        accessToken,
        refreshToken,
      });
  },
  me: async (req, res) => {
    const user = req.user;

    res.status(200).json(user);
  },
  refresh: (req, res) => {
    const clientType = req.clientType;

    if (clientType === "web") {
      const { accessToken, newRefreshToken } = authService.refresh(
        req.cookies.refreshToken,
      );

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

      res.status(200).json({ accessToken });
    }

    if (clientType === "mobile") {
      const { accessToken, newRefreshToken } = authService.refresh(
        req.body.refreshToken,
      );

      res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    }
  },
  logout: (req, res) => {},
} satisfies Record<string, RequestHandler>;

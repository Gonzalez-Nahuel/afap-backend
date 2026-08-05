import type { RequestHandler } from "express";
import { authService } from "./auth.service";

export const authController = {
  register: async (req, res) => {
    const user = await authService.registerUser(req.body);

    return res.status(200).json(user);
  },
  login: async (req, res) => {
    const clientType = req.clientType;

    const { user, accessToken, refreshToken } = await authService.loginUser({
      body: req.body,
      ...req.clientInfo!,
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

    return res.status(200).json(user);
  },
  refresh: async (req, res) => {
    const clientType = req.clientType;

    if (clientType === "web") {
      const { accessToken, newRefreshToken } = await authService.refresh({
        token: req.cookies.refreshToken,
        ...req.clientInfo!,
      });

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

      return res.status(200).json({ accessToken });
    }

    if (clientType === "mobile") {
      const { accessToken, newRefreshToken } = await authService.refresh({
        token: req.body.refreshToken,
        ...req.clientInfo!,
      });

      return res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    }
  },
  logout: async (req, res) => {
    const clientType = req.clientType;
    const refreshToken =
      clientType === "web" ? req.cookies.refreshToken : req.body.refreshToken;

    if (refreshToken) await authService.logout(refreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
    });

    return res.status(200).json({ ok: true });
  },
} satisfies Record<string, RequestHandler>;

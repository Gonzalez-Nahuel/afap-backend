import type { RequestHandler } from "express";
import { authService } from "./auth.service";

export const authController = {
  register: async (req, res) => {
    const user = await authService.registerUser(req.body);

    res.status(200).json(user);
  },
  login: async (req, res) => {
    const clientType = req.headers["x-client-type"] as "web" | "mobile";
    const { user, accessToken, refreshToken } = await authService.loginUser(
      req.body,
    );

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
} satisfies Record<string, RequestHandler>;

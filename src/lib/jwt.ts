import { env } from "@/config/env.js";
import jwt from "jsonwebtoken";

export interface UserPayload {
  id: string;
  username: string;
}

const generateToken = (
  payload: UserPayload,
  secret: string,
  expiresIn: "15m" | "7d",
) => {
  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

export const generateAccessToken = (payload: UserPayload) =>
  generateToken(payload, env.JWT_ACCESS_TOKEN_SECRET, env.ACCESS_TOKEN_EXPIRES);

export const generateRefreshToken = (payload: UserPayload) =>
  generateToken(
    payload,
    env.JWT_REFRESH_TOKEN_SECRET,
    env.REFRESH_TOKEN_EXPIRES,
  );

const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret);
};

export const verifyAccessToken = (token: string) =>
  verifyToken(token, env.JWT_ACCESS_TOKEN_SECRET);

export const verifyRefreshToken = (token: string) =>
  verifyToken(token, env.JWT_REFRESH_TOKEN_SECRET);

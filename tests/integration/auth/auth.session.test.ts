import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { app } from "../../../src/app.js";
import { generateAccessToken } from "@/lib/jwt.js";
import { env } from "@/config/env.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/modules/auth/auth.repository.js", () => ({
  authRepository: {},
}));

vi.mock("../../../src/modules/auth/auth.cache.js", () => ({
  authCache: {},
}));

vi.mock("../../../src/lib/send-email.js", () => ({
  sendVerificationOtp: vi.fn(),
  sendResetPasswordLink: vi.fn(),
}));

const GET = async (
  route: string,
  statusCode: number,
  headers: Record<string, string> = {},
) => {
  return await request(app).get(route).set(headers).expect(statusCode);
};

describe("GET /api/auth/me", () => {
  it("Return 401 if the token is missing", async () => {
    const response = await GET("/api/auth/me", 401);

    expect(response.body).toEqual({
      ok: false,
      code: "MISSING_TOKEN",
      message: "Token requerido",
    });
  });

  it("Return 401 if the token format is invalid", async () => {
    const response = await GET("/api/auth/me", 401, {
      authorization: "invalid",
    });

    expect(response.body).toEqual({
      ok: false,
      code: "INVALID_TOKEN",
      message: "Token inválido",
    });
  });

  it("Return 401 if the token is invalid", async () => {
    const response = await GET("/api/auth/me", 401, {
      authorization: "Bearer invalid",
    });

    expect(response.body).toEqual({
      ok: false,
      code: "TOKEN_ERROR",
      message: "Token inválido o mal formado",
    });
  });

  it("Return 200 with the authenticated user", async () => {
    const accesToken = generateAccessToken({
      id: "user-1",
      username: "user-1",
    });

    const response = await GET("/api/auth/me", 200, {
      authorization: `Bearer ${accesToken}`,
    });

    expect(response.body).toEqual({
      ok: true,
      user: { id: "user-1", username: "user-1" },
    });
  });

  it("Return 401 if the token is expired", async () => {
    const user = { id: "user-1", username: "user-1" };
    const accesToken = jwt.sign(user, env.JWT_ACCESS_TOKEN_SECRET, {
      expiresIn: -1,
    });

    const response = await GET("/api/auth/me", 401, {
      authorization: `Bearer ${accesToken}`,
    });

    expect(response.body).toEqual({
      ok: false,
      code: "TOKEN_EXPIRED_ERROR",
      message: "El token ha expirado",
    });
  });
});

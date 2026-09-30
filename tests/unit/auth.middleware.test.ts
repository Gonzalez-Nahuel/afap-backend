import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { authMiddleware } from "../../src/middlewares/auth.middleware.js";
import { verifyAccessToken } from "../../src/lib/jwt.js";
import { AppError } from "@/lib/app-error.js";

vi.mock(import("../../src/lib/jwt.js"), () => ({
  verifyAccessToken: vi.fn(),
}));

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("Add the user from the token to the request and continue", () => {
    const user = { id: "user-1", username: "pepito2" };

    vi.mocked(verifyAccessToken).mockReturnValue(user);

    const req = {
      headers: {
        authorization: "Bearer token-de-prueba",
      },
    } as Request;
    const res = {} as Response;
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(verifyAccessToken).toHaveBeenCalledWith("token-de-prueba");
    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledOnce();
  });

  it("Reject a header that does not use Bearer", () => {
    const req = {
      headers: {
        authorization: "token-de-prueba",
      },
    } as Request;
    const res = {} as Response;
    const next = vi.fn();

    expect(() => authMiddleware(req, res, next)).toThrow(AppError);
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

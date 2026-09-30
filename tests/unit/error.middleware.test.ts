import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../src/lib/app-error.js";
import { errorMiddleware } from "../../src/middlewares/error.middleware.js";

function responseDouble() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function handle(error: unknown) {
  const res = responseDouble();

  errorMiddleware(error, {} as Request, res as unknown as Response, vi.fn());

  return res;
}

describe("errorMiddleware", () => {
  it("returns the public status and code from AppError", () => {
    const res = handle(new AppError(409, "USER_EXISTS", "Email registrado"));

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      code: "USER_EXISTS",
      message: "Email registrado",
    });
  });

  it("turns Zod issues into a 400 response with field names", () => {
    const result = z
      .object({
        email: z.email(),
      })
      .safeParse({
        email: "invalid",
      });

    if (result.success) {
      throw new Error("Expected validation to fail");
    }

    const res = handle(result.error);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        code: "VALIDATION_ERROR",
        errors: expect.arrayContaining([
          expect.objectContaining({ field: "email" }),
        ]),
      }),
    );
  });

  it("returns 401 for expired JWTs", () => {
    const res = handle(new jwt.TokenExpiredError("expired", new Date()));

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "TOKEN_EXPIRED_ERROR",
      }),
    );
  });

  it("returns 401 for malformed JWTs", () => {
    const res = handle(new jwt.JsonWebTokenError("invalid signature"));

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "TOKEN_ERROR",
      }),
    );
  });

  it.each([
    ["P2002", 409, "CONFLICT_ERROR"],
    ["P2025", 404, "NOT_FOUND_ERROR"],
  ])("maps Prisma %s to HTTP %s", (code, status, expectedCode) => {
    const error = new Prisma.PrismaClientKnownRequestError("database error", {
      code,
      clientVersion: "7.8.0",
    });

    const res = handle(error);

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: expectedCode,
      }),
    );
  });

  it("does not expose stack traces for unknown errors in test mode", () => {
    const res = handle(new Error("internal secret"));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "Internal server error",
    });
  });
});

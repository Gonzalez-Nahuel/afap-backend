import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { validate } from "../../src/middlewares/validate.middleware.js";
import { loginUserSchema } from "../../src/modules/auth/auth.schema.js";

describe("validate middleware", () => {
  it("replaces the body with normalized values and sets client metadata", () => {
    const req = {
      headers: {
        "x-client-type": "web",
        "user-agent": "test-client",
      },
      body: {
        email: "USER@EXAMPLE.COM",
        password: "Secure123!",
      },
      params: {},
      query: {},
      ip: "127.0.0.1",
    } as unknown as Request;
    const next = vi.fn();

    validate(loginUserSchema)(req, {} as Response, next);

    expect(req.body.email).toBe("user@example.com");
    expect(req.clientType).toBe("web");
    expect(req.clientInfo).toEqual({
      ip: "127.0.0.1",
      userAgent: "test-client",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("throws a validation error and does not continue on invalid input", () => {
    const req = {
      headers: { "x-client-type": "web" },
      body: {
        email: "invalid",
        password: "Secure123!",
      },
      params: {},
      query: {},
      ip: "127.0.0.1",
    } as unknown as Request;
    const next = vi.fn();

    expect(() =>
      validate(loginUserSchema)(req, {} as Response, next),
    ).toThrow();

    expect(next).not.toHaveBeenCalled();
  });
});

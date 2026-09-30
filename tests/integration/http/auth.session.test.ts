import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/modules/auth/auth.service.js", () => ({
  authService: vi.fn(),
}));

describe("GET /api/auth/me", () => {
  it("responde 401 si falta el token", async () => {
    const response = await request(app).get("/api/auth/me").expect(401);

    expect(response.body).toEqual({
      ok: false,
      code: "MISSING_TOKEN",
      message: "Token requerido",
    });
  });
});

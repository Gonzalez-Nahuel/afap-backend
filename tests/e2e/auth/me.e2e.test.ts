import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "@/app.js";
import { generateAccessToken } from "@/lib/jwt.js";

describe("E2E - GET /api/auth/me", () => {
  it("returns the authenticated user when the access token is valid", async () => {
    const user = {
      id: "user-e2e-123",
      username: "e2e_nahuel",
    };

    const accessToken = generateAccessToken(user);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const response = await request(app).get("/api/auth/me").expect(401);

    expect(response.body).toMatchObject({
      ok: false,
      code: "MISSING_TOKEN",
    });
  });

  it("returns 401 when the Authorization header does not use Bearer", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "InvalidScheme some-token")
      .expect(401);

    expect(response.body).toMatchObject({
      ok: false,
      code: "INVALID_TOKEN",
    });
  });

  it("returns 401 when the Bearer token is empty", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer")
      .expect(401);

    expect(response.body).toMatchObject({
      ok: false,
      code: "INVALID_TOKEN",
    });
  });

  it("returns 401 when the access token is malformed", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.token.value")
      .expect(401);

    expect(response.status).toBe(401);
  });
});

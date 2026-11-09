import { prisma } from "@/lib/prisma.js";
import { app } from "@/app.js";
import { generateRefreshToken } from "@/lib/jwt.js";
import { hashToken } from "@/lib/hash-token.js";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";

const createdUserIds: string[] = [];

const createTestUser = async () => {
  const id = randomUUID();
  const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
  const email = `e2e-${id}@example.com`;
  const password = await bcrypt.hash("Password123!", 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password,
      isVerified: true,
    },
  });

  createdUserIds.push(user.id);

  return user;
};

const createTestSession = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    username: user.username,
  });

  const refreshTokenHash = hashToken(refreshToken);

  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      userAgent: "e2e-test-agent",
      ipAddress: "127.0.0.1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { refreshToken, refreshTokenHash, session };
};

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.session.deleteMany({
      where: { userId: { in: createdUserIds } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });

    createdUserIds.length = 0;
  }
});

describe("E2E - POST /api/auth/logout", () => {
  it("logs out successfully for a web client and clears the refresh token cookie", async () => {
    const user = await createTestUser();
    const { refreshToken, refreshTokenHash } = await createTestSession(user.id);

    const response = await request(app)
      .post("/api/auth/logout")
      .set("x-client-type", "web")
      .set("Cookie", `refreshToken=${refreshToken}`)
      .expect(200);

    expect(response.body).toEqual({ ok: true });

    const revokedSession = await prisma.session.findUnique({
      where: { refreshTokenHash },
    });

    expect(revokedSession?.isRevoked).toBe(true);

    const setCookie = response.headers["set-cookie"];

    expect(setCookie).toBeDefined();
    expect(setCookie?.[0]).toMatch(/refreshToken=;/);
    expect(setCookie?.[0]).toMatch(/HttpOnly/);
    expect(setCookie?.[0]).toMatch(/SameSite=Strict/);
  });

  it("logs out successfully for a mobile client and revokes its session", async () => {
    const user = await createTestUser();
    const { refreshToken, refreshTokenHash } = await createTestSession(user.id);

    const response = await request(app)
      .post("/api/auth/logout")
      .set("x-client-type", "mobile")
      .send({ refreshToken })
      .expect(200);

    expect(response.body).toEqual({ ok: true });

    const revokedSession = await prisma.session.findUnique({
      where: { refreshTokenHash },
    });

    expect(revokedSession?.isRevoked).toBe(true);
  });

  it("returns success for a web client without a refresh token cookie", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("x-client-type", "web")
      .expect(200);

    expect(response.body).toEqual({ ok: true });

    const setCookie = response.headers["set-cookie"];

    expect(setCookie).toBeDefined();
    expect(setCookie?.[0]).toMatch(/refreshToken=;/);
  });

  it("rejects a mobile client without a refresh token", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("x-client-type", "mobile")
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects a request without the client type header", async () => {
    const response = await request(app).post("/api/auth/logout").expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects an invalid client type", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("x-client-type", "desktop")
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });
});

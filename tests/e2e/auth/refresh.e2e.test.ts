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

const createTestSession = async (
  userId: string,
  options?: {
    isRevoked?: boolean;
    expiresAt?: Date;
  },
) => {
  const userPayload = {
    id: userId,
    username: "e2e_user",
  };

  const refreshToken = generateRefreshToken(userPayload);
  const refreshTokenHash = hashToken(refreshToken);

  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      userAgent: "e2e-test-agent",
      ipAddress: "127.0.0.1",
      isRevoked: options?.isRevoked ?? false,
      expiresAt:
        options?.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { refreshToken, refreshTokenHash, session };
};

describe("E2E - POST /api/auth/refresh", () => {
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

  it("refreshes successfully for a mobile client and rotates the refresh token", async () => {
    const user = await createTestUser();

    const { refreshToken, refreshTokenHash } = await createTestSession(user.id);

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("x-client-type", "mobile")
      .send({ refreshToken });

    console.log("STATUS:", response.status);
    console.log("BODY:", response.body);

    expect(response.body).toMatchObject({
      ok: true,
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });

    const newRefreshToken = response.body.refreshToken;
    const newRefreshTokenHash = hashToken(newRefreshToken);

    expect(newRefreshToken).not.toBe(refreshToken);

    const oldSession = await prisma.session.findUnique({
      where: { refreshTokenHash },
    });

    expect(oldSession?.isRevoked).toBe(true);

    const newSession = await prisma.session.findUnique({
      where: { refreshTokenHash: newRefreshTokenHash },
    });

    expect(newSession).toBeDefined();
    expect(newSession?.userId).toBe(user.id);
    expect(newSession?.isRevoked).toBe(false);
  });

  it("refreshes successfully for a web client and sets a new HttpOnly cookie", async () => {
    const user = await createTestUser();

    const { refreshToken, refreshTokenHash } = await createTestSession(user.id);

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("x-client-type", "web")
      .set("Cookie", `refreshToken=${refreshToken}`);

    console.log("STATUS:", response.status);
    console.log("BODY:", response.body);

    expect(response.body).toMatchObject({
      ok: true,
      accessToken: expect.any(String),
    });

    expect(response.body.refreshToken).toBeUndefined();

    const cookies = response.headers["set-cookie"] as string[] | undefined;

    const refreshTokenCookie = cookies?.find((cookie) =>
      cookie.startsWith("refreshToken="),
    );

    expect(refreshTokenCookie).toEqual(expect.any(String));
    expect(refreshTokenCookie).toContain("HttpOnly");
    expect(refreshTokenCookie).toContain("SameSite=Strict");

    const newRefreshToken = refreshTokenCookie
      ?.split(";")[0]
      ?.slice("refreshToken=".length);

    expect(newRefreshToken).toBeTruthy();
    expect(newRefreshToken).not.toBe(refreshToken);

    const oldSession = await prisma.session.findUnique({
      where: { refreshTokenHash },
    });

    expect(oldSession?.isRevoked).toBe(true);

    const newSession = await prisma.session.findUnique({
      where: {
        refreshTokenHash: hashToken(newRefreshToken!),
      },
    });

    expect(newSession).toBeDefined();
    expect(newSession?.userId).toBe(user.id);
    expect(newSession?.isRevoked).toBe(false);
  });

  it("returns 401 when a mobile client does not send a refresh token", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("x-client-type", "mobile")
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("returns 401 when a web client does not send a refresh token cookie", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("x-client-type", "web")
      .expect(401);

    expect(response.body).toMatchObject({
      code: "MISSING_TOKEN",
    });
  });

  it("returns 401 when the refresh token is malformed", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("x-client-type", "mobile")
      .send({ refreshToken: "invalid.token.value" })
      .expect(401);

    expect(response.status).toBe(401);
  });

  it("returns 401 when the refresh token has no associated session", async () => {
    const user = await createTestUser();

    const refreshToken = generateRefreshToken({
      id: user.id,
      username: user.username,
    });

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("x-client-type", "mobile")
      .send({ refreshToken })
      .expect(401);

    expect(response.body).toMatchObject({
      code: "INVALID_SESSION",
    });
  });

  it("returns 401 when the session has expired", async () => {
    const user = await createTestUser();

    const { refreshToken } = await createTestSession(user.id, {
      expiresAt: new Date(Date.now() - 1000),
    });

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("x-client-type", "mobile")
      .send({ refreshToken })
      .expect(401);

    expect(response.body).toMatchObject({
      code: "EXPIRED_SESSION",
    });
  });

  it("returns 401 and revokes all user sessions when using a revoked refresh token", async () => {
    const user = await createTestUser();

    const revokedSession = await createTestSession(user.id, {
      isRevoked: true,
    });

    const activeSession = await createTestSession(user.id);

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("x-client-type", "mobile")
      .send({ refreshToken: revokedSession.refreshToken })
      .expect(401);

    expect(response.body).toMatchObject({
      code: "INVALID_SESSION",
    });

    const oldSession = await prisma.session.findUnique({
      where: {
        refreshTokenHash: revokedSession.refreshTokenHash,
      },
    });

    expect(oldSession?.isRevoked).toBe(true);

    const otherSession = await prisma.session.findUnique({
      where: {
        refreshTokenHash: activeSession.refreshTokenHash,
      },
    });

    expect(otherSession?.isRevoked).toBe(true);
  });

  it("returns 400 when the client type header is missing", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("returns 400 when the client type header is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("x-client-type", "desktop")
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});

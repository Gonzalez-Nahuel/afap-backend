import { prisma } from "@/lib/prisma.js";
import { randomUUID } from "node:crypto";
import { it, describe, vi, expect, afterEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "@/app.js";
import { hashToken } from "@/lib/hash-token.js";
import { authRepository } from "@/modules/auth/auth.repository.js";

const createUserIds: string[] = [];

afterEach(async () => {
  if (createUserIds.length > 0) {
    await prisma.session.deleteMany({
      where: { userId: { in: createUserIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: createUserIds } } });
  }

  createUserIds.length = 0;
});

describe("E2E - POST /api/auth/login", () => {
  it("logs in successfully as a mobile client", async () => {
    const id = randomUUID();
    const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
    const email = `e2e-${id}@example.com`;
    const password = "Password123!";

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, email, password: passwordHash, isVerified: true },
    });

    const response = await request(app)
      .post("/api/auth/login")
      .set("x-client-type", "mobile")
      .send({ email, password })
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      user: { id: expect.any(String), username },
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });

    const userId = response.body.user.id;

    createUserIds.push(userId);

    const refreshToken = response.body.refreshToken;

    expect(refreshToken).toEqual(expect.any(String));

    const refreshTokenHash = hashToken(refreshToken);

    const session = await authRepository.getSession(refreshTokenHash);

    expect(session?.userId).toBe(userId);
    expect(session?.isRevoked).toBe(false);
    expect(session?.userAgent).toBeTruthy();
    expect(session?.ipAddress).toBeTruthy();

    expect(session?.refreshTokenHash).not.toBe(refreshToken);
  });

  it("logs in successfully as a web client", async () => {
    const id = randomUUID();
    const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
    const email = `e2e-${id}@example.com`;
    const password = "Password123!";

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, email, password: passwordHash, isVerified: true },
    });

    const response = await request(app)
      .post("/api/auth/login")
      .set("x-client-type", "web")
      .send({ email, password })
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      user: { id: expect.any(String), username },
      accessToken: expect.any(String),
    });

    const cookies = response.headers["set-cookie"] as string[] | undefined;
    const refreshTokenCookie = cookies?.find((cookie) =>
      cookie.startsWith("refreshToken="),
    );

    expect(refreshTokenCookie).toEqual(expect.any(String));
    expect(refreshTokenCookie).toContain("HttpOnly");
    expect(refreshTokenCookie).toContain("SameSite=Strict");

    const refreshToken = refreshTokenCookie
      ?.split(";")[0]
      ?.slice("refreshToken=".length);

    const userId = response.body.user.id;

    createUserIds.push(userId);

    const refreshTokenHash = hashToken(refreshToken!);

    const session = await authRepository.getSession(refreshTokenHash);

    expect(session!.userId).toBe(userId);
    expect(session!.isRevoked).toBe(false);
    expect(session!.ipAddress).toBeTruthy();
    expect(session!.userAgent).toBeTruthy();

    expect(session!.refreshTokenHash).not.toBe(refreshTokenCookie);
  });

  it("rejects login with an incorrect password", async () => {
    const id = randomUUID();
    const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
    const email = `e2e-${id}@example.com`;
    const password = "Password123!";

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: passwordHash,
        isVerified: true,
      },
    });

    createUserIds.push(user.id);

    const response = await request(app)
      .post("/api/auth/login")
      .set("x-client-type", "mobile")
      .send({ email, password: "WrongPassword123!" })
      .expect(401);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("INVALID_CREDENTIALS");

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions).toHaveLength(0);
  });

  it("rejects login with a non-existent email", async () => {
    const id = randomUUID();
    const email = `e2e-${id}@example.com`;

    const response = await request(app)
      .post("/api/auth/login")
      .set("x-client-type", "mobile")
      .send({
        email,
        password: "Password123!",
      })
      .expect(401);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("INVALID_CREDENTIALS");

    const user = await prisma.user.findUnique({
      where: { email },
    });

    expect(user).toBeNull();
  });

  it("rejects login if the user email is not verified", async () => {
    const id = randomUUID();
    const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
    const email = `e2e-${id}@example.com`;
    const password = "Password123!";

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: passwordHash,
        isVerified: false,
      },
    });

    createUserIds.push(user.id);

    const response = await request(app)
      .post("/api/auth/login")
      .set("x-client-type", "mobile")
      .send({ email, password })
      .expect(403);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("USER_NOT_VERIFIED");

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions).toHaveLength(0);
  });

  it("rejects login if x-client-type header is missing", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "Password123!",
      })
      .expect(400);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects login if x-client-type header is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("x-client-type", "aspodasw")
      .send({
        email: "test@example.com",
        password: "Password123!",
      })
      .expect(400);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects login with an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("x-client-type", "mobile")
      .send({
        email: "invalid-email",
        password: "Password123!",
      })
      .expect(400);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects login with a password shorter than 8 characters", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("x-client-type", "mobile")
      .send({
        email: "test@example.com",
        password: "1234567",
      })
      .expect(400);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });
});

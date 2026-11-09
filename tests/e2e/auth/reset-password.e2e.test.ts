import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { redis } from "@/lib/redis.js";
import { authCache } from "@/modules/auth/auth.cache.js";
import { generateRefreshToken } from "@/lib/jwt.js";
import { hashToken } from "@/lib/hash-token.js";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

const createdUserIds: string[] = [];
const testEmails: string[] = [];

const OLD_PASSWORD = "OldPassword123!";
const NEW_PASSWORD = "NewPassword123!";

const createTestUser = async () => {
  const id = randomUUID();
  const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
  const email = `e2e-${id}@example.com`;
  const password = await bcrypt.hash(OLD_PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password,
      isVerified: true,
    },
  });

  createdUserIds.push(user.id);
  testEmails.push(email);

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

const createResetPasswordCache = async (
  email: string,
  userId: string,
  token: string,
) => {
  await authCache.createResetPasswordLink({
    email,
    userId,
    token: hashToken(token),
    attempts: 0,
    retries: 0,
    ttl: 900,
  });
};

afterEach(async () => {
  for (const email of testEmails) {
    await redis.del(`password:reset:${email}`);
  }

  testEmails.length = 0;

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

describe("E2E - POST /api/auth/reset-password", () => {
  it("resets the password, revokes all user sessions and deletes the reset token", async () => {
    const user = await createTestUser();

    const firstSession = await createTestSession(user.id);
    const secondSession = await createTestSession(user.id);

    const token = randomUUID();

    await createResetPasswordCache(user.email, user.id, token);

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token,
        password: NEW_PASSWORD,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      message: "La contraseña fue actualizada con éxito",
    });

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(await bcrypt.compare(NEW_PASSWORD, updatedUser.password)).toBe(true);

    expect(await bcrypt.compare(OLD_PASSWORD, updatedUser.password)).toBe(
      false,
    );

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions).toHaveLength(2);
    expect(sessions.every((session) => session.isRevoked)).toBe(true);

    expect(await authCache.getResetPasswordLinkCache(user.email)).toBeNull();
  });

  it("rejects an incorrect reset token", async () => {
    const user = await createTestUser();

    const token = randomUUID();
    const incorrectToken = randomUUID();

    await createResetPasswordCache(user.email, user.id, token);

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token: incorrectToken,
        password: NEW_PASSWORD,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "INVALID_OR_EXPIRED_TOKEN",
    });

    const unchangedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(await bcrypt.compare(OLD_PASSWORD, unchangedUser.password)).toBe(
      true,
    );

    expect(
      await authCache.getResetPasswordLinkCache(user.email),
    ).not.toBeNull();
  });

  it("rejects the request when the reset token does not exist in Redis", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token: randomUUID(),
        password: NEW_PASSWORD,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "INVALID_OR_EXPIRED_TOKEN",
    });

    const unchangedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(await bcrypt.compare(OLD_PASSWORD, unchangedUser.password)).toBe(
      true,
    );
  });

  it("rejects a valid token when it belongs to another email", async () => {
    const user = await createTestUser();

    const token = randomUUID();
    const anotherEmail = `another-${randomUUID()}@example.com`;

    testEmails.push(anotherEmail);

    await createResetPasswordCache(user.email, user.id, token);

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: anotherEmail,
        token,
        password: NEW_PASSWORD,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "INVALID_OR_EXPIRED_TOKEN",
    });

    const unchangedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(await bcrypt.compare(OLD_PASSWORD, unchangedUser.password)).toBe(
      true,
    );
  });

  it("rejects a request without an email", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: randomUUID(),
        password: NEW_PASSWORD,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: "invalid-email",
        token: randomUUID(),
        password: NEW_PASSWORD,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects an invalid UUID token", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token: "invalid-token",
        password: NEW_PASSWORD,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects a password shorter than 8 characters", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token: randomUUID(),
        password: "Ab1!",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects a password without an uppercase letter", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token: randomUUID(),
        password: "newpassword123!",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects a password without a lowercase letter", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token: randomUUID(),
        password: "NEWPASSWORD123!",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects a password without a number", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token: randomUUID(),
        password: "NewPassword!",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects a password without a special character", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token: randomUUID(),
        password: "NewPassword123",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects a password longer than 100 characters", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token: randomUUID(),
        password: `Aa1!${"a".repeat(97)}`,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects additional properties in the request body", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: user.email,
        token: randomUUID(),
        password: NEW_PASSWORD,
        extra: "not-allowed",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });
});

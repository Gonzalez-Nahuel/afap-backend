import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { redis } from "@/lib/redis.js";
import { authCache } from "@/modules/auth/auth.cache.js";
import { hashToken } from "@/lib/hash-token.js";
import { sendResetPasswordLink } from "@/lib/send-email.js";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/send-email.js", () => ({
  sendVerificationOtp: vi.fn(),
  sendResetPasswordLink: vi.fn(),
}));

const createdUserIds: string[] = [];
const testEmails: string[] = [];

const createTestUser = async (options?: { isVerified?: boolean }) => {
  const id = randomUUID();
  const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
  const email = `e2e-${id}@example.com`;
  const password = await bcrypt.hash("Password123!", 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password,
      isVerified: options?.isVerified ?? true,
    },
  });

  createdUserIds.push(user.id);
  testEmails.push(email);

  return user;
};

const createResetPasswordCache = async (
  email: string,
  options: {
    userId: string;
    retries?: number;
    attempts?: number;
    token?: string;
    ttl?: number;
  },
) => {
  await authCache.createResetPasswordLink({
    email,
    userId: options.userId,
    token: options.token ?? "old-token-hash",
    retries: options.retries ?? 0,
    attempts: options.attempts ?? 0,
    ttl: options.ttl ?? 900,
  });
};

beforeEach(() => {
  vi.mocked(sendResetPasswordLink).mockReset();
  vi.mocked(sendResetPasswordLink).mockResolvedValue({
    id: "fake-id",
  });
});

afterEach(async () => {
  for (const email of testEmails) {
    await redis.del(
      `password:reset:${email}`,
      `lock:password:resend:${email}`,
      `lock:password:retries:${email}`,
    );
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

describe("E2E - POST /api/auth/forgot-password", () => {
  it("creates a reset password link and sends an email for a verified user", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email })
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      message: expect.any(String),
    });

    expect(sendResetPasswordLink).toHaveBeenCalledTimes(1);

    const emailCall = vi
      .mocked(sendResetPasswordLink)
      .mock.calls.find(([sentEmail]) => sentEmail === user.email);

    expect(emailCall).toBeDefined();

    const token = emailCall![1];

    expect(token).toEqual(expect.any(String));

    const cachedData = await authCache.getResetPasswordLinkCache(user.email);

    expect(cachedData).not.toBeNull();

    const parsedData = JSON.parse(cachedData!);

    expect(parsedData).toMatchObject({
      userId: user.id,
      attempts: 0,
      retries: 0,
      token: hashToken(token),
    });

    expect(await redis.ttl(`password:reset:${user.email}`)).toBeGreaterThan(0);
    expect(
      await redis.ttl(`lock:password:resend:${user.email}`),
    ).toBeGreaterThan(0);
  });

  it("returns success without sending an email when the user does not exist", async () => {
    const email = `unknown-${randomUUID()}@example.com`;
    testEmails.push(email);

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email })
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      message: expect.any(String),
    });

    expect(sendResetPasswordLink).not.toHaveBeenCalled();

    expect(await authCache.getResetPasswordLinkCache(email)).toBeNull();

    expect(await authCache.canRetryResetPasswordLink(email)).toBe(false);
  });

  it("returns success without sending an email when the user is not verified", async () => {
    const user = await createTestUser({ isVerified: false });

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email })
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      message: expect.any(String),
    });

    expect(sendResetPasswordLink).not.toHaveBeenCalled();

    expect(await authCache.getResetPasswordLinkCache(user.email)).toBeNull();

    expect(await authCache.canRetryResetPasswordLink(user.email)).toBe(false);
  });

  it("resends the link and increments retries when reset data already exists", async () => {
    const user = await createTestUser();

    await createResetPasswordCache(user.email, {
      userId: user.id,
      retries: 2,
      attempts: 3,
    });

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(sendResetPasswordLink).toHaveBeenCalledTimes(1);

    const emailCall = vi.mocked(sendResetPasswordLink).mock.calls[0];

    expect(emailCall![0]).toBe(user.email);

    const newToken = emailCall![1];

    const cachedData = await authCache.getResetPasswordLinkCache(user.email);

    const parsedData = JSON.parse(cachedData!);

    expect(parsedData).toMatchObject({
      userId: user.id,
      attempts: 0,
      retries: 3,
      token: hashToken(newToken),
    });

    expect(parsedData.token).not.toBe("old-token-hash");
    expect(
      await redis.ttl(`lock:password:resend:${user.email}`),
    ).toBeGreaterThan(0);
  });

  it("deletes reset data and activates the retry lock when retries reach 5", async () => {
    const user = await createTestUser();

    await createResetPasswordCache(user.email, {
      userId: user.id,
      retries: 5,
    });

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email })
      .expect(200);

    expect(response.body.ok).toBe(true);

    expect(sendResetPasswordLink).not.toHaveBeenCalled();

    expect(await authCache.getResetPasswordLinkCache(user.email)).toBeNull();

    expect(await authCache.canRetryResetPasswordLink(user.email)).toBe(false);
  });

  it("does not send another email when the retry lock is active", async () => {
    const user = await createTestUser();

    await redis.set(`lock:password:retries:${user.email}`, "1", "EX", 1200);

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email })
      .expect(200);

    expect(response.body.ok).toBe(true);

    expect(sendResetPasswordLink).not.toHaveBeenCalled();

    expect(await authCache.getResetPasswordLinkCache(user.email)).toBeNull();
  });

  it("returns 429 when the resend cooldown is active", async () => {
    const user = await createTestUser();

    await redis.set(`lock:password:resend:${user.email}`, "1", "EX", 60);

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email })
      .expect(429);

    expect(response.body).toMatchObject({
      ok: false,
      code: "TOO_MANY_REQUEST",
    });

    expect(sendResetPasswordLink).not.toHaveBeenCalled();
  });

  it("normalizes the email before processing the request", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: `  ${user.email.toUpperCase()}  ` })
      .expect(200);

    expect(response.body.ok).toBe(true);

    expect(sendResetPasswordLink).toHaveBeenCalledTimes(1);

    expect(sendResetPasswordLink).toHaveBeenCalledWith(
      user.email,
      expect.any(String),
    );
  });

  it("rejects a request without an email", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });

    expect(sendResetPasswordLink).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "invalid-email" })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });

    expect(sendResetPasswordLink).not.toHaveBeenCalled();
  });

  it("rejects an email longer than 80 characters", async () => {
    const email = `${"a".repeat(70)}@example.com`;

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });

    expect(sendResetPasswordLink).not.toHaveBeenCalled();
  });

  it("rejects additional properties in the request body", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({
        email: "test@example.com",
        extra: "not-allowed",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });

    expect(sendResetPasswordLink).not.toHaveBeenCalled();
  });
});

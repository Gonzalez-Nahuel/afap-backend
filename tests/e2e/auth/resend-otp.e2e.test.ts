import { prisma } from "@/lib/prisma.js";
import { redis } from "../../../src/lib/redis.js";
import { authCache } from "@/modules/auth/auth.cache.js";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "@/app.js";
import { hashToken } from "@/lib/hash-token.js";

vi.mock("../../../src/lib/send-email.js", () => ({
  sendVerificationOtp: vi.fn(),
  sendResetPasswordLink: vi.fn(),
}));

import { sendVerificationOtp } from "../../../src/lib/send-email.js";

const createdEmails: string[] = [];

const createTestUser = async (isVerified = false) => {
  const id = randomUUID();

  const email = `e2e-${id}@example.com`;
  const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;

  const password = await bcrypt.hash("Password123!", 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password,
      isVerified,
    },
  });

  createdEmails.push(email);

  return user;
};

const createVerificationCache = async (
  email: string,
  userId: string,
  retries = 0,
) => {
  await authCache.createVerificationOtp({
    email,
    userId,
    token: hashToken("123456"),
    attempts: 0,
    retries,
    ttl: 15 * 60,
  });
};

describe("E2E - POST /api/auth/resend-otp", () => {
  beforeEach(() => {
    vi.mocked(sendVerificationOtp).mockClear();
    vi.mocked(sendVerificationOtp).mockResolvedValue({
      id: "fake-id",
    });
  });

  afterEach(async () => {
    for (const email of createdEmails) {
      await redis.del(
        `auth:verification:${email}`,
        `lock:resend:${email}`,
        `lock:verification:retries:${email}`,
        `auth:verification:shield:${email}`,
      );

      await prisma.user.deleteMany({
        where: { email },
      });
    }

    createdEmails.length = 0;
  });

  it("resends the OTP successfully when verification data already exists", async () => {
    const user = await createTestUser(false);

    const email = user.email;

    await createVerificationCache(email, user.id, 1);

    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({ email })
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      message: expect.any(String),
    });

    expect(sendVerificationOtp).toHaveBeenCalledTimes(1);

    const emailCall = vi
      .mocked(sendVerificationOtp)
      .mock.calls.find(([sentEmail]) => sentEmail === email);

    expect(emailCall).toBeDefined();

    const otp = emailCall![1];

    expect(otp).toMatch(/^\d{6}$/);

    const verificationData = await authCache.getVerificationOtpCache(email);

    expect(verificationData).not.toBeNull();

    const parsedData = JSON.parse(verificationData!);

    expect(parsedData).toMatchObject({
      userId: user.id,
      attempts: 0,
      retries: 2,
      token: hashToken(otp),
    });

    const resendLock = await redis.exists(`lock:resend:${email}`);

    expect(resendLock).toBe(1);
  });

  it("creates a new OTP when verification data does not exist", async () => {
    const user = await createTestUser(false);

    const email = user.email;

    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({ email })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(sendVerificationOtp).toHaveBeenCalledTimes(1);

    const emailCall = vi
      .mocked(sendVerificationOtp)
      .mock.calls.find(([sentEmail]) => sentEmail === email);

    expect(emailCall).toBeDefined();

    const otp = emailCall![1];

    expect(otp).toMatch(/^\d{6}$/);

    const verificationData = await authCache.getVerificationOtpCache(email);

    expect(verificationData).not.toBeNull();

    const parsedData = JSON.parse(verificationData!);

    expect(parsedData).toMatchObject({
      userId: user.id,
      attempts: 0,
      retries: 0,
      token: hashToken(otp),
    });

    expect(await redis.exists(`lock:resend:${email}`)).toBe(1);
  });

  it("returns success without sending an email when the user does not exist", async () => {
    const id = randomUUID();
    const email = `e2e-${id}@example.com`;

    createdEmails.push(email);

    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({ email })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(sendVerificationOtp).not.toHaveBeenCalled();

    expect(await redis.exists(`auth:verification:shield:${email}`)).toBe(1);

    expect(await authCache.getVerificationOtpCache(email)).toBeNull();
  });

  it("returns success without sending an email when the user is already verified", async () => {
    const user = await createTestUser(true);

    const email = user.email;

    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({ email })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(sendVerificationOtp).not.toHaveBeenCalled();

    expect(await redis.exists(`auth:verification:shield:${email}`)).toBe(1);

    expect(await authCache.getVerificationOtpCache(email)).toBeNull();
  });

  it("returns 429 when the resend cooldown is active", async () => {
    const user = await createTestUser(false);

    const email = user.email;

    await redis.set(`lock:resend:${email}`, "1", "EX", 60);

    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({ email })
      .expect(429);

    expect(response.body).toBeDefined();
    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("deletes the OTP and activates the retry lock when retries reach 5", async () => {
    const user = await createTestUser(false);

    const email = user.email;

    await createVerificationCache(email, user.id, 5);

    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({ email })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(sendVerificationOtp).not.toHaveBeenCalled();

    expect(await authCache.getVerificationOtpCache(email)).toBeNull();

    expect(await redis.exists(`lock:verification:retries:${email}`)).toBe(1);
  });

  it("does not resend an OTP when the retry lock is active", async () => {
    const user = await createTestUser(false);

    const email = user.email;

    await createVerificationCache(email, user.id, 2);

    await redis.set(`lock:verification:retries:${email}`, "1", "EX", 20 * 60);

    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({ email })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(sendVerificationOtp).not.toHaveBeenCalled();

    const verificationData = await authCache.getVerificationOtpCache(email);

    expect(verificationData).not.toBeNull();

    expect(JSON.parse(verificationData!)).toMatchObject({
      userId: user.id,
      attempts: 0,
      retries: 2,
      token: hashToken("123456"),
    });
  });

  it("does not resend an OTP when the verification shield is active", async () => {
    const user = await createTestUser(false);

    const email = user.email;

    await authCache.setVerificationShieldCache(email);

    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({ email })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(sendVerificationOtp).not.toHaveBeenCalled();

    expect(await authCache.getVerificationOtpCache(email)).toBeNull();
  });

  it("returns 400 when the email is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({ email: "invalid-email" })
      .expect(400);

    expect(response.body).toBeDefined();
    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("returns 400 when the email is missing", async () => {
    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({})
      .expect(400);

    expect(response.body).toBeDefined();
    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("returns 400 when the body contains unexpected properties", async () => {
    const response = await request(app)
      .post("/api/auth/resend-otp")
      .send({
        email: "test@example.com",
        username: "unexpected",
      })
      .expect(400);

    expect(response.body).toBeDefined();
    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });
});

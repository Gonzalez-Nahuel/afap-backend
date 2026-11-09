import {
  describe,
  it,
  beforeAll,
  afterAll,
  expect,
  vi,
  afterEach,
} from "vitest";
import request from "supertest";
import { prisma } from "../../../src/lib/prisma.js";
import { redis } from "../../../src/lib/redis.js";
import { app } from "@/app.js";
import {
  sendResetPasswordLink,
  sendVerificationOtp,
} from "@/lib/send-email.js";
import { randomUUID } from "node:crypto";
import { authRepository } from "@/modules/auth/auth.repository.js";
import { authCache } from "@/modules/auth/auth.cache.js";

vi.mock("../../../src/lib/send-email.js", () => ({
  sendVerificationOtp: vi.fn(),
  sendResetPasswordLink: vi.fn(),
}));

describe("E2E - POST /api/auth/register", () => {
  beforeAll(async () => {
    await prisma.$connect();
    await redis.ping();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  let testEmail: string | undefined;
  let otpKey: string | undefined;

  afterEach(async () => {
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    if (otpKey) {
      await redis.del(otpKey);
    }

    testEmail = undefined;
    otpKey = undefined;
  });

  it("connects to the test database and redis", async () => {
    const result = await prisma.$queryRaw<
      [{ result: number }]
    >`SELECT 1 AS result`;

    expect(Number(result[0].result)).toBe(1);
    expect(await redis.ping()).toBe("PONG");
  });

  it("registers a user in PostgreSQL and stores the OTP in Redis", async () => {
    const id = randomUUID();

    const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
    const email = `e2e-${id}@example.com`;
    const password = "Password123!";

    testEmail = email;
    otpKey = `auth:verification:${email}`;

    vi.mocked(sendVerificationOtp).mockResolvedValue({ id: "fake-id" });

    const response = await request(app)
      .post("/api/auth/register")
      .send({ username, email, password })
      .expect(200);

    const otp = await authCache.getVerificationOtpCache(email);

    expect(otp).not.toBeNull();
    expect(sendVerificationOtp).toHaveBeenCalledWith(email, expect.any(String));

    const parsedOtp = JSON.parse(otp!);

    expect(parsedOtp.token).toEqual(expect.any(String));
    expect(parsedOtp.userId).toEqual(expect.any(String));

    const userId = parsedOtp.userId;

    const user = await authRepository.findUserById(userId);

    expect(user?.email).toBe(email);
    expect(user?.username).toBe(username);
    expect(user?.password).not.toBe(password);
    expect(user?.isVerified).toBe(false);

    expect(response.body).toMatchObject({
      ok: true,
      user: {
        username,
        email,
        id: expect.any(String),
        createdAt: expect.any(String),
      },
      message:
        "Usuario registrado con éxito. Se ha enviado un código de verificación a tu correo electrónico",
    });
  });

  it("Verifies the user's email using the OTP generated during registration", async () => {
    const id = randomUUID();

    const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
    const email = `e2e-${id}@example.com`;
    const password = "Password123!";

    testEmail = email;
    otpKey = `auth:verification:${email}`;

    vi.mocked(sendVerificationOtp).mockClear();
    vi.mocked(sendVerificationOtp).mockResolvedValue({ id: "fake-id" });

    await request(app)
      .post("/api/auth/register")
      .send({ username, email, password })
      .expect(200);

    const emailCall = vi
      .mocked(sendVerificationOtp)
      .mock.calls.find(([sentEmail]) => sentEmail === email);

    expect(emailCall).toBeDefined();

    const token = emailCall![1];

    expect(token).toMatch(/^\d{6}$/);

    const userBefore = await authRepository.findUserByEmail(email);

    expect(userBefore?.isVerified).toBe(false);

    const response = await request(app)
      .post("/api/auth/verify-email")
      .send({ email, token })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.message).toBe("Usuario verificado con éxito");

    const otp = await authCache.getVerificationOtpCache(email);

    expect(otp).toBe(null);

    const userAfter = await authRepository.findUserByEmail(email);

    expect(userAfter?.isVerified).toBe(true);
  });

  it("Rejects an invalid otp and incremets verification attemps", async () => {
    const id = randomUUID();

    const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
    const email = `e2e-${id}@example.com`;
    const password = "Password123!";

    testEmail = email;
    otpKey = `auth:verification:${email}`;

    vi.mocked(sendVerificationOtp).mockClear();
    vi.mocked(sendVerificationOtp).mockResolvedValue({ id: "fake-id" });

    await request(app)
      .post("/api/auth/register")
      .send({ username, email, password })
      .expect(200);

    const emailCall = vi
      .mocked(sendVerificationOtp)
      .mock.calls.find(([sentEmail]) => sentEmail === email);

    expect(emailCall).toBeDefined();

    const correctOtp = emailCall![1];

    const wrongOtp = correctOtp === "000000" ? "000001" : "000000";

    const response = await request(app)
      .post("/api/auth/verify-email")
      .send({ email, token: wrongOtp })
      .expect(401);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("VERIFICATION_TOKEN_INVALID");
    expect(response.body.message).toBe("El código de verificación es inválido");

    const verificationData = await authCache.getVerificationOtpCache(email);

    expect(verificationData).not.toBeNull();

    const parsedVerificationData = JSON.parse(verificationData!);

    const attempts = parsedVerificationData.attempts;

    expect(Number(attempts)).toBe(1);

    const userAfter = await authRepository.findUserByEmail(email);

    expect(userAfter?.isVerified).toBe(false);
  });

  it("rejects email verification after 5 failed attempts", async () => {
    const id = randomUUID();

    const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
    const email = `e2e-${id}@example.com`;
    const password = "Password123!";

    testEmail = email;
    otpKey = `auth:verification:${email}`;

    vi.mocked(sendVerificationOtp).mockClear();
    vi.mocked(sendVerificationOtp).mockResolvedValue({ id: "fake-id" });

    await request(app)
      .post("/api/auth/register")
      .send({ username, email, password })
      .expect(200);

    const emailCall = vi
      .mocked(sendVerificationOtp)
      .mock.calls.find(([sentEmail]) => sentEmail === email);

    expect(emailCall).toBeDefined();

    const correctOtp = emailCall![1];

    const wrongOtp = correctOtp === "000000" ? "000001" : "000000";

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/auth/verify-email")
        .send({ email, token: wrongOtp })
        .expect(401);
    }

    const response = await request(app)
      .post("/api/auth/verify-email")
      .send({ email, token: wrongOtp })
      .expect(429);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("TOO_MANY_ATTEMPTS");

    const verificationData = await authCache.getVerificationOtpCache(email);

    expect(verificationData).not.toBeNull();

    const parsedVerificationData = JSON.parse(verificationData!);

    const attempts = parsedVerificationData.attempts;

    expect(Number(attempts)).toBe(5);

    const user = await authRepository.findUserByEmail(email);

    expect(user?.isVerified).toBe(false);
  });

  it("rejects email verification if OTP does not exist or has expired", async () => {
    const email = "test-email@test.com";
    const token = "000000";

    const response = await request(app)
      .post("/api/auth/verify-email")
      .send({ email, token })
      .expect(404);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe("VERIFICATION_TOKEN_NOT_FOUND_OR_EXPIRED");

    const verificationData = await authCache.getVerificationOtpCache(email);

    expect(verificationData).toBeNull();
  });
});

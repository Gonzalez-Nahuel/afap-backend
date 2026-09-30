import { describe, expect, it, vi, beforeEach } from "vitest";
import { authService } from "../../src/modules/auth/auth.service.js";
import { authCache } from "../../src/modules/auth/auth.cache.js";
import { authRepository } from "../../src/modules/auth/auth.repository.js";
import { hashToken } from "../../src/lib/hash-token.js";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt.js";

vi.mock("../../src/modules/auth/auth.cache.js", () => ({
  authCache: {
    getVerificationOtpCache: vi.fn(),
    incrementVerificationAttempts: vi.fn(),
    deleteVerificationOtpCache: vi.fn(),
  },
}));

vi.mock("../../src/modules/auth/auth.repository.js", () => ({
  authRepository: {
    verifyUserAccount: vi.fn(),
    findUserByEmail: vi.fn(),
    createSession: vi.fn(),
  },
}));

vi.mock("../../src/lib/jwt.js", () => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

vi.mock("../../src/lib/send-email.js", () => ({
  sendVerificationOtp: vi.fn(),
  sendResetPasswordLink: vi.fn(),
}));

describe("authService.verifyEmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const email = "user123@gmail.com";

  it("Log the attempt and reject an incorrect OTP", async () => {
    const verificationData = {
      token: hashToken("123456"),
      userId: "user-1",
      attempts: 0,
    };

    vi.mocked(authCache.getVerificationOtpCache).mockResolvedValue(
      JSON.stringify(verificationData),
    );

    await expect(
      authService.verifyEmail("000000", email),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "VERIFICATION_TOKEN_INVALID",
      message: "El código de verificación es inválido",
    });

    expect(authCache.incrementVerificationAttempts).toHaveBeenCalledWith(
      email,
      verificationData,
    );

    expect(authRepository.verifyUserAccount).not.toHaveBeenCalled();
  });

  it("Verify the account when the OTP is correct, remove data from the cache, and return the userId", async () => {
    const verificationData = {
      token: hashToken("123456"),
      userId: "user-1",
      attempts: 0,
    };

    vi.mocked(authCache.getVerificationOtpCache).mockResolvedValue(
      JSON.stringify(verificationData),
    );

    await expect(authService.verifyEmail("123456", email)).resolves.toBe(
      verificationData.userId,
    );

    expect(authCache.deleteVerificationOtpCache).toHaveBeenCalledWith(email);

    expect(authRepository.verifyUserAccount).toHaveBeenCalledWith(
      verificationData.userId,
    );

    expect(authCache.incrementVerificationAttempts).not.toHaveBeenCalled();
  });

  it("Reject an expired or non-existent OTP", async () => {
    vi.mocked(authCache.getVerificationOtpCache).mockResolvedValue(null);

    await expect(
      authService.verifyEmail("123456", email),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "VERIFICATION_TOKEN_NOT_FOUND_OR_EXPIRED",
      message:
        "El código de verificación no existe o ha expirado. Solicita uno nuevo",
    });

    expect(authCache.deleteVerificationOtpCache).not.toHaveBeenCalled();

    expect(authRepository.verifyUserAccount).not.toHaveBeenCalled();

    expect(authCache.incrementVerificationAttempts).not.toHaveBeenCalled();
  });

  it("Block a request that reached the rate limit", async () => {
    const verificationData = {
      token: hashToken("123456"),
      userId: "user-1",
      attempts: 5,
    };

    vi.mocked(authCache.getVerificationOtpCache).mockResolvedValue(
      JSON.stringify(verificationData),
    );

    await expect(
      authService.verifyEmail("123456", email),
    ).rejects.toMatchObject({
      statusCode: 429,
      code: "TOO_MANY_ATTEMPTS",
      message:
        "Has superado el límite de intentos permitidos. Solicita un nuevo código",
    });

    expect(authCache.deleteVerificationOtpCache).not.toHaveBeenCalled();

    expect(authRepository.verifyUserAccount).not.toHaveBeenCalled();

    expect(authCache.incrementVerificationAttempts).not.toHaveBeenCalled();
  });
});

describe("authService.loginUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const ip = "0.0.0.0";
  const userAgent = "XXXXXX";
  const body = {
    email: "user123@gmail.com",
    password: "Secure1!",
  };

  const loginData = {
    body,
    ip,
    userAgent,
  };

  it("Reject a non-existent email without creating a session", async () => {
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);

    await expect(authService.loginUser(loginData)).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Credenciales inválidas",
    });

    expect(authRepository.findUserByEmail).toHaveBeenCalledWith(body.email);

    expect(authRepository.createSession).not.toHaveBeenCalled();
  });

  it("Reject an incorrect password without creating a session", async () => {
    const password = await bcrypt.hash("Secure2!", 10);

    vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
      id: "user-1",
      username: "user_dev",
      email: "user123@gmail.com",
      password,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(authService.loginUser(loginData)).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Credenciales inválidas",
    });

    expect(authRepository.findUserByEmail).toHaveBeenCalledWith(body.email);

    expect(authRepository.createSession).not.toHaveBeenCalled();
  });

  it("Prevent login for an unverified account", async () => {
    const password = await bcrypt.hash("Secure1!", 10);

    vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
      id: "user-1",
      username: "user_dev",
      email: "user123@gmail.com",
      password,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(authService.loginUser(loginData)).rejects.toMatchObject({
      statusCode: 403,
      code: "USER_NOT_VERIFIED",
      message: "La cuenta aún no ha sido verificada. Verifíquela",
    });

    expect(authRepository.findUserByEmail).toHaveBeenCalledWith(body.email);

    expect(authRepository.createSession).not.toHaveBeenCalled();
  });

  it("Allow login and create a session for a registered and verified user", async () => {
    const password = await bcrypt.hash("Secure1!", 10);

    vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
      id: "user-1",
      username: "user_dev",
      email: "user123@gmail.com",
      password,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(generateAccessToken).mockReturnValue("access-token");
    vi.mocked(generateRefreshToken).mockReturnValue("refresh-token");

    await expect(authService.loginUser(loginData)).resolves.toMatchObject({
      user: { id: "user-1", username: "user_dev" },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    expect(authRepository.createSession).toHaveBeenCalledWith({
      userId: "user-1",
      refreshTokenHash: hashToken("refresh-token"),
      ipAddress: ip,
      userAgent,
      expiresAt: expect.any(Date),
    });
  });
});

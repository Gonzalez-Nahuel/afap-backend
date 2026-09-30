import { describe, expect, it, vi } from "vitest";
import { authService } from "../../src/modules/auth/auth.service.js";
import { authCache } from "../../src/modules/auth/auth.cache.js";
import { authRepository } from "../../src/modules/auth/auth.repository.js";
import { hashToken } from "../../src/lib/hash-token.js";
import { beforeEach } from "node:test";
import bcrypt from "bcrypt";

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

  it("registra el intento y rechaza otp incorrecto", async () => {
    const verificationData = {
      token: hashToken("1234567"),
      userId: "user-1",
      attempts: 0,
    };

    vi.mocked(authCache.getVerificationOtpCache).mockResolvedValue(
      JSON.stringify(verificationData),
    );

    await expect(authService.verifyEmail("00000", email)).rejects.toMatchObject(
      {
        statusCode: 401,
        code: "VERIFICATION_TOKEN_INVALID",
        message: "El código de verificación es inválido",
      },
    );

    expect(authCache.incrementVerificationAttempts).toHaveBeenCalledWith(
      email,
      verificationData,
    );

    expect(authRepository.verifyUserAccount).not.toHaveBeenCalled();
  });

  it("verifica la cuenta cuando el otp es correcto, elimina los datos de la caché y devuelve el userId", async () => {
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

  it("rechaza un otp vencido o inexistente", async () => {
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

  it("bloquea petición que alcanzó el límite de intentos", async () => {
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

  it("rechaza un email inexistente sin crear una sesión", async () => {
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);

    await expect(authService.loginUser(loginData)).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Credenciales inválidas",
    });

    expect(authRepository.findUserByEmail).toHaveBeenCalledWith(body.email);

    expect(authRepository.createSession).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña incorrecta sin crear una sessión", async () => {
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

  it("impide el login de una cuenta no verificada", async () => {
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
});

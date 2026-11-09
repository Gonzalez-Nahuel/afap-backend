import request from "supertest";
import { it, describe, expect, vi, beforeEach } from "vitest";
import { app } from "../../../src/app.js";
import { authRepository } from "@/modules/auth/auth.repository.js";
import { authCache } from "@/modules/auth/auth.cache.js";
import { sendVerificationOtp } from "@/lib/send-email.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "@/lib/app-error.js";

vi.mock("../../../src/modules/auth/auth.repository.js", () => ({
  authRepository: {
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
  },
}));

vi.mock("../../../src/modules/auth/auth.cache.js", () => ({
  authCache: {
    deleteVerificationShieldCache: vi.fn(),
    createVerificationOtp: vi.fn(),
    lockResendVerificationOtp: vi.fn(),
  },
}));

vi.mock("../../../src/lib/send-email.js", () => ({
  sendVerificationOtp: vi.fn(),
  sendResetPasswordLink: vi.fn(),
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("Return 400 if the password format is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        username: "user123",
        email: "username@email.com",
        password: "invalid",
      })
      .expect(400);

    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("Return 409 if the email is already registered", async () => {
    const existingUser = {
      id: "user-123",
      username: "user123",
      email: "username@email.com",
      password: "hashed-password",
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(existingUser);

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        username: "user123",
        email: "username@email.com",
        password: "Password123!",
      })
      .expect(409);

    expect(response.body).toMatchObject({
      ok: false,
      code: "USER_EXISTS",
      message: "El email ya está registrado",
    });

    expect(authRepository.findUserByEmail).toHaveBeenCalledWith(
      "username@email.com",
    );
  });

  it("Return 409 if the database detects a duplicated resource", async () => {
    const user = {
      username: "user123",
      email: "username@email.com",
      password: "Password123!",
    };

    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "test",
      },
    );

    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);

    vi.mocked(authRepository.createUser).mockRejectedValue(prismaError);

    const response = await request(app)
      .post("/api/auth/register")
      .send(user)
      .expect(409);

    expect(response.body).toMatchObject({
      ok: false,
      code: "CONFLICT_ERROR",
      message: "El recurso que intentas crear ya existe (llave duplicada)",
    });
  });

  it("Return 502 if the verification email cannot be sent", async () => {
    const user = {
      username: "user123",
      email: "username@email.com",
      password: "Password123!",
    };

    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);

    vi.mocked(authRepository.createUser).mockResolvedValue({
      id: "user-123",
      username: "nahuel123",
      email: "nahuel@test.com",
      createdAt: new Date(),
    });

    vi.mocked(sendVerificationOtp).mockRejectedValue(
      new AppError(
        502,
        "EMAIL_SEND_ERROR",
        "No se pudo enviar el email, intenta de nuevo más tarde",
      ),
    );

    const response = await request(app)
      .post("/api/auth/register")
      .send(user)
      .expect(502);

    expect(response.body).toMatchObject({
      ok: false,
      code: "EMAIL_SEND_ERROR",
      message: "No se pudo enviar el email, intenta de nuevo más tarde",
    });
  });

  it("Return 200 when the user is registered succefully", async () => {
    const user = {
      username: "user123",
      email: "username@email.com",
      id: "user-123",
      createdAt: new Date(),
    };

    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);

    vi.mocked(authRepository.createUser).mockResolvedValue(user);

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        username: "user123",
        email: "username@email.com",
        password: "Password123!",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      user: { ...user, createdAt: user.createdAt.toISOString() },
      message:
        "Usuario registrado con éxito. Se ha enviado un código de verificación a tu correo electrónico",
    });

    expect(authRepository.findUserByEmail).toHaveBeenCalledWith(user.email);

    expect(authRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "user123",
        email: "username@email.com",
        passwordHash: expect.any(String),
      }),
    );

    expect(
      vi.mocked(authRepository.createUser).mock.calls[0]![0].passwordHash,
    ).not.toBe("Password123!");

    expect(authCache.deleteVerificationShieldCache(user.email));

    expect(authCache.createVerificationOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: user.email,
        token: expect.any(String),
        userId: user.id,
        attempts: 0,
        retries: 0,
        ttl: 900,
      }),
    );

    expect(authCache.lockResendVerificationOtp).toHaveBeenCalledWith(
      user.email,
    );

    expect(sendVerificationOtp).toHaveBeenCalledWith(
      user.email,
      expect.any(String),
    );
  });
});

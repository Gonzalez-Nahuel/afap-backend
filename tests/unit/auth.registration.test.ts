import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import { authService } from "../../src/modules/auth/auth.service.js";
import { authRepository } from "../../src/modules/auth/auth.repository.js";
import { authCache } from "../../src/modules/auth/auth.cache.js";
import { generateOTP } from "../../src/lib/generate-otp-code.js";
import { hashToken } from "../../src/lib/hash-token.js";
import { sendVerificationOtp } from "../../src/lib/send-email.js";

vi.mock("../../src/modules/auth/auth.repository.js", () => ({
  authRepository: { findUserByEmail: vi.fn(), createUser: vi.fn() },
}));

vi.mock("../../src/modules/auth/auth.cache.js", () => ({
  authCache: {
    deleteVerificationShieldCache: vi.fn(),
    createVerificationOtp: vi.fn(),
    lockResendVerificationOtp: vi.fn(),
    canResendVerficationOtp: vi.fn(),
    isVerificationShieldActive: vi.fn(),
    canRetryVerificationOtp: vi.fn(),
    getVerificationOtpCache: vi.fn(),
    deleteVerificationOtpCache: vi.fn(),
    lockVerificationOtpRetries: vi.fn(),
    setVerificationShieldCache: vi.fn(),
  },
}));

vi.mock("../../src/lib/generate-otp-code.js", () => ({
  generateOTP: vi.fn(),
}));

vi.mock("../../src/lib/send-email.js", () => ({
  sendVerificationOtp: vi.fn(),
  sendResetPasswordLink: vi.fn(),
}));

const email = "user@example.com";
const registration = {
  username: "user_dev",
  email,
  password: "Secure123!",
};

const existingUser = {
  id: "user-1",
  username: "user_dev",
  email,
  password: "hashed-password",
  isVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(generateOTP).mockReturnValue("123456");
});

describe("authService.registerUser", () => {
  it("rejects an existing email without creating another user", async () => {
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(existingUser);

    await expect(authService.registerUser(registration)).rejects.toMatchObject({
      statusCode: 409,
      code: "USER_EXISTS",
    });

    expect(authRepository.createUser).not.toHaveBeenCalled();
    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("hashes the password and stores only the OTP hash with a 15-minute TTL", async () => {
    const createdUser = {
      id: "user-1",
      username: registration.username,
      email,
      createdAt: new Date(),
    };

    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);
    vi.mocked(authRepository.createUser).mockResolvedValue(createdUser);

    await expect(authService.registerUser(registration)).resolves.toEqual(
      createdUser,
    );

    const savedUser = vi.mocked(authRepository.createUser).mock.calls[0]?.[0];

    expect(savedUser).toMatchObject({
      username: registration.username,
      email,
    });
    expect(savedUser?.passwordHash).not.toBe(registration.password);
    expect(
      await bcrypt.compare(registration.password, savedUser!.passwordHash),
    ).toBe(true);

    expect(authCache.deleteVerificationShieldCache).toHaveBeenCalledWith(email);

    expect(authCache.createVerificationOtp).toHaveBeenCalledWith({
      email,
      token: hashToken("123456"),
      userId: createdUser.id,
      attempts: 0,
      retries: 0,
      ttl: 900,
    });

    expect(authCache.lockResendVerificationOtp).toHaveBeenCalledWith(email);
    expect(sendVerificationOtp).toHaveBeenCalledWith(email, "123456");
  });
});

describe("authService.resendOtp", () => {
  it("enforces the resend cooldown", async () => {
    vi.mocked(authCache.canResendVerficationOtp).mockResolvedValue(false);

    await expect(authService.resendOtp(email)).rejects.toMatchObject({
      statusCode: 429,
      code: "TOO_MANY_REQUEST",
    });

    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("does not send mail when the verification shield is active", async () => {
    vi.mocked(authCache.canResendVerficationOtp).mockResolvedValue(true);
    vi.mocked(authCache.isVerificationShieldActive).mockResolvedValue(true);

    await expect(authService.resendOtp(email)).resolves.toBeUndefined();

    expect(authRepository.findUserByEmail).not.toHaveBeenCalled();
    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("rotates a cached OTP and resets attempts while counting retries", async () => {
    vi.mocked(authCache.canResendVerficationOtp).mockResolvedValue(true);
    vi.mocked(authCache.isVerificationShieldActive).mockResolvedValue(false);
    vi.mocked(authCache.canRetryVerificationOtp).mockResolvedValue(true);
    vi.mocked(authCache.getVerificationOtpCache).mockResolvedValue(
      JSON.stringify({
        token: "previous-hash",
        userId: "user-1",
        attempts: 4,
        retries: 2,
      }),
    );

    await authService.resendOtp(email);

    expect(authCache.createVerificationOtp).toHaveBeenCalledWith({
      email,
      token: hashToken("123456"),
      userId: "user-1",
      attempts: 0,
      retries: 3,
      ttl: 900,
    });
    expect(authCache.lockResendVerificationOtp).toHaveBeenCalledWith(email);
    expect(sendVerificationOtp).toHaveBeenCalledWith(email, "123456");
  });

  it("locks resends after the retry limit without sending mail", async () => {
    vi.mocked(authCache.canResendVerficationOtp).mockResolvedValue(true);
    vi.mocked(authCache.isVerificationShieldActive).mockResolvedValue(false);
    vi.mocked(authCache.canRetryVerificationOtp).mockResolvedValue(true);
    vi.mocked(authCache.getVerificationOtpCache).mockResolvedValue(
      JSON.stringify({
        token: "previous-hash",
        userId: "user-1",
        attempts: 0,
        retries: 5,
      }),
    );

    await authService.resendOtp(email);

    expect(authCache.deleteVerificationOtpCache).toHaveBeenCalledWith(email);
    expect(authCache.lockVerificationOtpRetries).toHaveBeenCalledWith(email);
    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("returns silently for an unknown email", async () => {
    vi.mocked(authCache.canResendVerficationOtp).mockResolvedValue(true);
    vi.mocked(authCache.isVerificationShieldActive).mockResolvedValue(false);
    vi.mocked(authCache.canRetryVerificationOtp).mockResolvedValue(true);
    vi.mocked(authCache.getVerificationOtpCache).mockResolvedValue(null);
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);

    await expect(authService.resendOtp(email)).resolves.toBeUndefined();

    expect(authCache.setVerificationShieldCache).toHaveBeenCalledWith(email);
    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("sends a new OTP for an unverified user whose old code expired", async () => {
    vi.mocked(authCache.canResendVerficationOtp).mockResolvedValue(true);
    vi.mocked(authCache.isVerificationShieldActive).mockResolvedValue(false);
    vi.mocked(authCache.canRetryVerificationOtp).mockResolvedValue(true);
    vi.mocked(authCache.getVerificationOtpCache).mockResolvedValue(null);
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(existingUser);

    await authService.resendOtp(email);

    expect(authCache.createVerificationOtp).toHaveBeenCalledWith({
      email,
      token: hashToken("123456"),
      userId: existingUser.id,
      attempts: 0,
      retries: 0,
      ttl: 900,
    });
    expect(sendVerificationOtp).toHaveBeenCalledWith(email, "123456");
  });
});

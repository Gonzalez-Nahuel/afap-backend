import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import { authService } from "../../src/modules/auth/auth.service.js";
import { authRepository } from "../../src/modules/auth/auth.repository.js";
import { authCache } from "../../src/modules/auth/auth.cache.js";
import { hashToken } from "../../src/lib/hash-token.js";
import { sendResetPasswordLink } from "../../src/lib/send-email.js";

vi.mock("../../src/modules/auth/auth.repository.js", () => ({
  authRepository: {
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    resetUserPassword: vi.fn(),
    changeUserPassword: vi.fn(),
  },
}));

vi.mock("../../src/modules/auth/auth.cache.js", () => ({
  authCache: {
    canSendResetPasswordLink: vi.fn(),
    canRetryResetPasswordLink: vi.fn(),
    getResetPasswordLinkCache: vi.fn(),
    createResetPasswordLink: vi.fn(),
    lockSendResetPasswordLink: vi.fn(),
    lockResetPasswordLinkRetries: vi.fn(),
    deleteResetPasswordLinkCache: vi.fn(),
  },
}));

vi.mock("../../src/lib/send-email.js", () => ({
  sendVerificationOtp: vi.fn(),
  sendResetPasswordLink: vi.fn(),
}));

const email = "user@example.com";
const token = "550e8400-e29b-41d4-a716-446655440000";

const user = {
  id: "user-1",
  username: "user_dev",
  email,
  password: "stored-hash",
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.resetAllMocks());

describe("authService.forgotPassword", () => {
  it("enforces the request cooldown", async () => {
    vi.mocked(authCache.canSendResetPasswordLink).mockResolvedValue(false);

    await expect(authService.forgotPassword(email)).rejects.toMatchObject({
      statusCode: 429,
      code: "TOO_MANY_REQUEST",
    });

    expect(sendResetPasswordLink).not.toHaveBeenCalled();
  });

  it("does not reveal or email an unknown account", async () => {
    vi.mocked(authCache.canSendResetPasswordLink).mockResolvedValue(true);
    vi.mocked(authCache.canRetryResetPasswordLink).mockResolvedValue(true);
    vi.mocked(authCache.getResetPasswordLinkCache).mockResolvedValue(null);
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);

    await expect(authService.forgotPassword(email)).resolves.toBeUndefined();

    expect(authCache.lockResetPasswordLinkRetries).toHaveBeenCalledWith(email);
    expect(authCache.createResetPasswordLink).not.toHaveBeenCalled();
    expect(sendResetPasswordLink).not.toHaveBeenCalled();
  });

  it("stores a token hash and sends the raw reset link to a verified user", async () => {
    vi.mocked(authCache.canSendResetPasswordLink).mockResolvedValue(true);
    vi.mocked(authCache.canRetryResetPasswordLink).mockResolvedValue(true);
    vi.mocked(authCache.getResetPasswordLinkCache).mockResolvedValue(null);
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(user);

    await authService.forgotPassword(email);

    const sentToken = vi.mocked(sendResetPasswordLink).mock.calls[0]?.[1];

    expect(sentToken).toMatch(/^[0-9a-f-]{36}$/i);
    expect(sendResetPasswordLink).toHaveBeenCalledWith(email, sentToken);

    expect(authCache.createResetPasswordLink).toHaveBeenCalledWith({
      email,
      token: hashToken(sentToken!),
      userId: user.id,
      attempts: 0,
      retries: 0,
      ttl: 900,
    });
    expect(authCache.lockSendResetPasswordLink).toHaveBeenCalledWith(email);
  });

  it("locks further links after five resends", async () => {
    vi.mocked(authCache.canSendResetPasswordLink).mockResolvedValue(true);
    vi.mocked(authCache.canRetryResetPasswordLink).mockResolvedValue(true);
    vi.mocked(authCache.getResetPasswordLinkCache).mockResolvedValue(
      JSON.stringify({
        token: "old-hash",
        userId: user.id,
        retries: 5,
      }),
    );

    await authService.forgotPassword(email);

    expect(authCache.lockResetPasswordLinkRetries).toHaveBeenCalledWith(email);
    expect(authCache.deleteResetPasswordLinkCache).toHaveBeenCalledWith(email);
    expect(sendResetPasswordLink).not.toHaveBeenCalled();
  });

  it("rotates an existing reset link and counts the resend", async () => {
    vi.mocked(authCache.canSendResetPasswordLink).mockResolvedValue(true);
    vi.mocked(authCache.canRetryResetPasswordLink).mockResolvedValue(true);
    vi.mocked(authCache.getResetPasswordLinkCache).mockResolvedValue(
      JSON.stringify({
        token: "old-hash",
        userId: user.id,
        retries: 2,
      }),
    );

    await authService.forgotPassword(email);

    const sentToken = vi.mocked(sendResetPasswordLink).mock.calls[0]?.[1];

    expect(authCache.createResetPasswordLink).toHaveBeenCalledWith({
      email,
      token: hashToken(sentToken!),
      userId: user.id,
      attempts: 0,
      retries: 3,
      ttl: 900,
    });
    expect(authRepository.findUserByEmail).not.toHaveBeenCalled();
  });
});

describe("authService.resetPassword", () => {
  const data = {
    email,
    token,
    password: "NewSecure123!",
  };

  it("rejects an expired link without changing the password", async () => {
    vi.mocked(authCache.getResetPasswordLinkCache).mockResolvedValue(null);

    await expect(authService.resetPassword(data)).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_OR_EXPIRED_TOKEN",
    });

    expect(authRepository.resetUserPassword).not.toHaveBeenCalled();
  });

  it("rejects a token that does not match the cached hash", async () => {
    vi.mocked(authCache.getResetPasswordLinkCache).mockResolvedValue(
      JSON.stringify({
        token: hashToken("another-token"),
        userId: user.id,
      }),
    );

    await expect(authService.resetPassword(data)).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_OR_EXPIRED_TOKEN",
    });

    expect(authRepository.resetUserPassword).not.toHaveBeenCalled();
    expect(authCache.deleteResetPasswordLinkCache).not.toHaveBeenCalled();
  });

  it("hashes the new password and consumes a valid link", async () => {
    vi.mocked(authCache.getResetPasswordLinkCache).mockResolvedValue(
      JSON.stringify({
        token: hashToken(token),
        userId: user.id,
      }),
    );

    await authService.resetPassword(data);

    const savedHash = vi.mocked(authRepository.resetUserPassword).mock
      .calls[0]?.[1];

    expect(savedHash).not.toBe(data.password);
    expect(await bcrypt.compare(data.password, savedHash!)).toBe(true);
    expect(authRepository.resetUserPassword).toHaveBeenCalledWith(
      user.id,
      savedHash,
    );
    expect(authCache.deleteResetPasswordLinkCache).toHaveBeenCalledWith(email);
  });
});

describe("authService.changePassword", () => {
  it("rejects a user who no longer exists", async () => {
    vi.mocked(authRepository.findUserById).mockResolvedValue(null);

    await expect(
      authService.changePassword(user.id, "Current123!", "NewSecure123!"),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "PASSWORD_MISMATCH",
    });

    expect(authRepository.changeUserPassword).not.toHaveBeenCalled();
  });

  it("rejects an incorrect current password", async () => {
    const storedHash = await bcrypt.hash("Current123!", 10);

    vi.mocked(authRepository.findUserById).mockResolvedValue({
      ...user,
      password: storedHash,
    });

    await expect(
      authService.changePassword(user.id, "Wrong123!", "NewSecure123!"),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "PASSWORD_MISMATCH",
    });

    expect(authRepository.changeUserPassword).not.toHaveBeenCalled();
  });

  it("hashes a valid new password and passes it to the repository", async () => {
    const currentPassword = "Current123!";
    const newPassword = "NewSecure123!";
    const storedHash = await bcrypt.hash(currentPassword, 10);

    vi.mocked(authRepository.findUserById).mockResolvedValue({
      ...user,
      password: storedHash,
    });

    await authService.changePassword(user.id, currentPassword, newPassword);

    const savedHash = vi.mocked(authRepository.changeUserPassword).mock
      .calls[0]?.[1];

    expect(savedHash).not.toBe(newPassword);
    expect(await bcrypt.compare(newPassword, savedHash!)).toBe(true);
    expect(authRepository.changeUserPassword).toHaveBeenCalledWith(
      user.id,
      savedHash,
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "../../src/modules/auth/auth.service.js";
import { authRepository } from "../../src/modules/auth/auth.repository.js";
import { hashToken } from "../../src/lib/hash-token.js";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "../../src/lib/jwt.js";

vi.mock("../../src/modules/auth/auth.repository.js", () => ({
  authRepository: {
    getSession: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllUserSessions: vi.fn(),
    createSession: vi.fn(),
  },
}));

vi.mock("../../src/modules/auth/auth.cache.js", () => ({
  authCache: {},
}));

vi.mock("../../src/lib/send-email.js", () => ({
  sendVerificationOtp: vi.fn(),
  sendResetPasswordLink: vi.fn(),
}));

vi.mock("../../src/lib/jwt.js", () => ({
  verifyRefreshToken: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
}));

const oldToken = "old-refresh-token";

const refreshData = {
  token: oldToken,
  ip: "127.0.0.1",
  userAgent: "test-client",
};

const session = () => ({
  id: "session-1",
  userId: "user-1",
  refreshTokenHash: hashToken(oldToken),
  ipAddress: "127.0.0.1",
  userAgent: "test-client",
  isRevoked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 60_000),
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(verifyRefreshToken).mockReturnValue({
    id: "user-1",
    username: "user_dev",
    iat: 1,
    exp: 2,
  });
});

describe("authService.refresh", () => {
  it("rejects a missing refresh token", async () => {
    await expect(
      authService.refresh({ ...refreshData, token: "" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "MISSING_TOKEN",
    });

    expect(verifyRefreshToken).not.toHaveBeenCalled();
    expect(authRepository.getSession).not.toHaveBeenCalled();
  });

  it("rejects a token with no stored session", async () => {
    vi.mocked(authRepository.getSession).mockResolvedValue(null);

    await expect(authService.refresh(refreshData)).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_SESSION",
    });

    expect(authRepository.getSession).toHaveBeenCalledWith(hashToken(oldToken));
    expect(authRepository.createSession).not.toHaveBeenCalled();
  });

  it("revokes all sessions after reuse of a revoked token", async () => {
    vi.mocked(authRepository.getSession).mockResolvedValue({
      ...session(),
      isRevoked: true,
    });

    await expect(authService.refresh(refreshData)).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_SESSION",
    });

    expect(authRepository.revokeAllUserSessions).toHaveBeenCalledWith("user-1");
    expect(authRepository.createSession).not.toHaveBeenCalled();
  });

  it("rejects an expired stored session without rotating it", async () => {
    vi.mocked(authRepository.getSession).mockResolvedValue({
      ...session(),
      expiresAt: new Date(Date.now() - 1),
    });

    await expect(authService.refresh(refreshData)).rejects.toMatchObject({
      statusCode: 401,
      code: "EXPIRED_SESSION",
    });

    expect(authRepository.revokeSession).not.toHaveBeenCalled();
    expect(authRepository.createSession).not.toHaveBeenCalled();
  });

  it("revokes the old session and stores a new hashed token", async () => {
    vi.mocked(authRepository.getSession).mockResolvedValue(session());
    vi.mocked(generateAccessToken).mockReturnValue("new-access-token");
    vi.mocked(generateRefreshToken).mockReturnValue("new-refresh-token");

    await expect(authService.refresh(refreshData)).resolves.toEqual({
      accessToken: "new-access-token",
      newRefreshToken: "new-refresh-token",
    });

    expect(authRepository.revokeSession).toHaveBeenCalledWith(
      hashToken(oldToken),
    );
    expect(generateAccessToken).toHaveBeenCalledWith({
      id: "user-1",
      username: "user_dev",
    });
    expect(generateRefreshToken).toHaveBeenCalledWith({
      id: "user-1",
      username: "user_dev",
    });
    expect(authRepository.createSession).toHaveBeenCalledWith({
      userId: "user-1",
      refreshTokenHash: hashToken("new-refresh-token"),
      ipAddress: refreshData.ip,
      userAgent: refreshData.userAgent,
      expiresAt: expect.any(Date),
    });
  });
});

describe("authService.logout", () => {
  it("revokes a session by the hash of its refresh token", async () => {
    await authService.logout(oldToken);

    expect(authRepository.revokeSession).toHaveBeenCalledWith(
      hashToken(oldToken),
    );
  });
});

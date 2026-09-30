import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../src/lib/jwt.js";

const user = {
  id: "user-1",
  username: "user_dev",
};

afterEach(() => vi.useRealTimers());

describe("JWT access and refresh tokens", () => {
  it("signs tokens with the expected identity and independent secrets", () => {
    const access = generateAccessToken(user);
    const refresh = generateRefreshToken(user);

    expect(verifyAccessToken(access)).toMatchObject(user);
    expect(verifyRefreshToken(refresh)).toMatchObject(user);
    expect(() => verifyAccessToken(refresh)).toThrow();
    expect(() => verifyRefreshToken(access)).toThrow();
  });

  it("expires access tokens after 15 minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const access = generateAccessToken(user);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

    expect(() => verifyAccessToken(access)).toThrow();
  });
});

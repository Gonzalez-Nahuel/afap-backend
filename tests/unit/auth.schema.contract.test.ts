import { describe, expect, it } from "vitest";
import {
  registerUserSchema,
  loginUserSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  logoutSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../../src/modules/auth/auth.schema.js";

const validRegistration = {
  username: "user_dev",
  email: "user@example.com",
  password: "Secure123!",
};

describe("registration and login contracts", () => {
  it.each([
    ["uppercase letter", "secure123!"],
    ["lowercase letter", "SECURE123!"],
    ["digit", "SecurePass!"],
    ["special character", "Secure1234"],
  ])("rejects a password without a %s", (_reason, password) => {
    const result = registerUserSchema.safeParse({
      body: { ...validRegistration, password },
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join(".") === "body.password",
        ),
      ).toBe(true);
    }
  });

  it("rejects unexpected fields in the registration body", () => {
    const result = registerUserSchema.safeParse({
      body: { ...validRegistration, isVerified: true },
    });

    expect(result.success).toBe(false);
  });

  it.each(["web", "mobile"] as const)(
    "accepts %s login and normalizes email",
    (clientType) => {
      const parsed = loginUserSchema.parse({
        headers: { "x-client-type": clientType },
        body: {
          email: "USER@EXAMPLE.COM",
          password: "Secure123!",
        },
      });

      expect(parsed.body.email).toBe("user@example.com");
    },
  );

  it("rejects an unknown client type", () => {
    expect(
      loginUserSchema.safeParse({
        headers: { "x-client-type": "desktop" },
        body: {
          email: "user@example.com",
          password: "Secure123!",
        },
      }).success,
    ).toBe(false);
  });
});

describe("verification and session contracts", () => {
  it.each(["12345", "1234567", "abcdef"])("rejects invalid OTP %s", (token) => {
    const result = verifyEmailSchema.safeParse({
      body: { email: "user@example.com", token },
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join(".") === "body.token",
        ),
      ).toBe(true);
    }
  });

  it.each([refreshTokenSchema, logoutSchema])(
    "requires a body refresh token for mobile clients",
    (schema) => {
      const result = schema.safeParse({
        headers: { "x-client-type": "mobile" },
        body: {},
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) => issue.path.join(".") === "body.refreshToken",
          ),
        ).toBe(true);
      }

      expect(
        schema.safeParse({
          headers: { "x-client-type": "mobile" },
          body: { refreshToken: "token" },
        }).success,
      ).toBe(true);
    },
  );

  it.each([refreshTokenSchema, logoutSchema])(
    "allows web clients without a body token",
    (schema) => {
      expect(
        schema.safeParse({
          headers: { "x-client-type": "web" },
        }).success,
      ).toBe(true);
    },
  );
});

describe("password contracts", () => {
  it("requires a UUID token for password reset", () => {
    const result = resetPasswordSchema.safeParse({
      body: {
        email: "user@example.com",
        token: "not-a-uuid",
        password: "Secure123!",
      },
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join(".") === "body.token",
        ),
      ).toBe(true);
    }
  });

  it("requires a strong new password on change", () => {
    const result = changePasswordSchema.safeParse({
      body: {
        currentPassword: "Secure123!",
        newPassword: "weak",
      },
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join(".") === "body.newPassword",
        ),
      ).toBe(true);
    }
  });
});

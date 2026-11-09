import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt.js";
import { hashToken } from "@/lib/hash-token.js";

const OLD_PASSWORD = "OldPassword123!";
const NEW_PASSWORD = "NewPassword456!";

const createdUserIds: string[] = [];

const createTestUser = async () => {
  const id = randomUUID();

  const username = `e2e_${id.replace(/-/g, "").slice(0, 10)}`;
  const email = `e2e-${id}@example.com`;
  const password = await bcrypt.hash(OLD_PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password,
      isVerified: true,
    },
  });

  createdUserIds.push(user.id);

  const accessToken = generateAccessToken({
    id: user.id,
    username: user.username,
  });

  return { user, accessToken };
};

const createTestSession = async (userId: string, username: string) => {
  const refreshToken = generateRefreshToken({
    id: userId,
    username,
  });

  const refreshTokenHash = hashToken(refreshToken);

  return prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      userAgent: "E2E Test",
      ipAddress: "127.0.0.1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
};

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.session.deleteMany({
      where: {
        userId: { in: createdUserIds },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: createdUserIds },
      },
    });

    createdUserIds.length = 0;
  }
});

describe("POST /change-password", () => {
  describe("Successful password change", () => {
    it("should change the password and revoke all user sessions", async () => {
      const { user, accessToken } = await createTestUser();

      await createTestSession(user.id, user.username);
      await createTestSession(user.id, user.username);

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: NEW_PASSWORD,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        message: "La contraseña fue actualizada con éxito",
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser).not.toBeNull();

      const oldPasswordIsValid = await bcrypt.compare(
        OLD_PASSWORD,
        updatedUser!.password,
      );

      const newPasswordIsValid = await bcrypt.compare(
        NEW_PASSWORD,
        updatedUser!.password,
      );

      expect(oldPasswordIsValid).toBe(false);
      expect(newPasswordIsValid).toBe(true);

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });

      expect(sessions).toHaveLength(2);
      expect(sessions.every((session) => session.isRevoked)).toBe(true);
    });
  });

  describe("Password validation", () => {
    it("should return 400 when the current password is incorrect", async () => {
      const { user, accessToken } = await createTestUser();

      await createTestSession(user.id, user.username);

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: "WrongPassword123!",
          newPassword: NEW_PASSWORD,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("PASSWORD_MISMATCH");

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });

      expect(sessions.every((session) => !session.isRevoked)).toBe(true);
    });

    it("should return 400 when the new password is the same as the current password", async () => {
      const { user, accessToken } = await createTestUser();

      await createTestSession(user.id, user.username);

      const originalUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: OLD_PASSWORD,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("SAME_PASSWORD_ERROR");

      const updatedUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });

      expect(updatedUser.password).toBe(originalUser.password);

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });

      expect(sessions).toHaveLength(1);
      expect(sessions.every((session) => !session.isRevoked)).toBe(true);
    });

    it("should return 400 when the user does not exist", async () => {
      const accessToken = generateAccessToken({
        id: randomUUID(),
        username: "nonexistent",
      });

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: NEW_PASSWORD,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("PASSWORD_MISMATCH");
    });
  });

  describe("Authentication", () => {
    it("should return 401 when the access token is missing", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: NEW_PASSWORD,
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("MISSING_TOKEN");
    });

    it("should return 401 when the authorization scheme is not Bearer", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", "Basic some-token")
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: NEW_PASSWORD,
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("INVALID_TOKEN");
    });

    it("should return 401 when the access token is malformed", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", "Bearer invalid-token")
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: NEW_PASSWORD,
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("TOKEN_ERROR");
    });
  });

  describe("Request validation", () => {
    it("should return 400 when required fields are missing", async () => {
      const { accessToken } = await createTestUser();

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when the current password is too short", async () => {
      const { accessToken } = await createTestUser();

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: "Short1!",
          newPassword: NEW_PASSWORD,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when the new password has no uppercase letter", async () => {
      const { accessToken } = await createTestUser();

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: "newpassword123!",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when the new password has no lowercase letter", async () => {
      const { accessToken } = await createTestUser();

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: "NEWPASSWORD123!",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when the new password has no number", async () => {
      const { accessToken } = await createTestUser();

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: "NewPassword!!",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when the new password has no special character", async () => {
      const { accessToken } = await createTestUser();

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: "NewPassword123",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when the new password exceeds 100 characters", async () => {
      const { accessToken } = await createTestUser();

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: `Aa1!${"a".repeat(97)}`,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when the request contains unexpected fields", async () => {
      const { accessToken } = await createTestUser();

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: OLD_PASSWORD,
          newPassword: NEW_PASSWORD,
          unexpectedField: "unexpected",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });
  });
});

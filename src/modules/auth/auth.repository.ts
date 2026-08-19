import { prisma } from "@/lib/prisma";
import type {
  CreateSessionDTO,
  RegisterUserDTO,
  VerificationDataDto,
} from "./auth.dto";
import { redis } from "@/lib/redis";

export const authRepository = {
  createUser: async (
    data: RegisterUserDTO & {
      passwordHash: string;
    },
  ) => {
    return await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });
  },

  findUserByEmail: async (email: string) => {
    return await prisma.user.findUnique({ where: { email } });
  },

  createVerificationToken: async (
    email: string,
    token: string,
    userId: string,
    ttl: number,
  ) => {
    await redis.set(
      `auth:verification:${email}`,
      JSON.stringify({ token, userId, attemps: 0 }),
      "EX",
      ttl,
    );
  },

  lockResendOtp: async (email: string) => {
    return await redis.set(`lock:resend:${email}`, "1", "EX", 60);
  },

  canResendOtp: async (email: string) => {
    const exists = await redis.exists(`lock:resend:${email}`);

    return exists === 0;
  },

  setUserVerifiedInCache: async (email: string) => {
    const ttl = 60 * 15;

    await redis.set(`user:status:verified:${email}`, "1", "EX", ttl);
  },

  isAlreadyVerifiedInCache: async (email: string) => {
    const exists = await redis.exists(`user:status:verified:${email}`);

    return exists === 1;
  },

  getVerificationUserData: async (email: string) => {
    return await redis.get(`auth:verification:${email}`);
  },

  incrementVerificationAttemps: async (
    email: string,
    data: VerificationDataDto,
  ) => {
    const ttlRemaining = await redis.ttl(`auth:verification:${email}`);

    if (ttlRemaining === 0) return;

    const verificationData = {
      ...data,
      attemps: data.attemps + 1,
    };

    return await redis.set(
      `auth:verification:${email}`,
      JSON.stringify(verificationData),
      "EX",
      ttlRemaining,
    );
  },

  verifyUserAccount: async (id: string, email: string) => {
    await redis.del(`auth:verification:${email}`);

    await prisma.user.update({
      where: { id },
      data: { isVerified: true },
      select: {
        id: true,
      },
    });
  },

  createSession: async (data: CreateSessionDTO) => {
    return await prisma.session.create({
      data: {
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      },
    });
  },

  getSession: async (refreshTokenHash: string) => {
    return await prisma.session.findUnique({ where: { refreshTokenHash } });
  },

  revokeSession: async (refreshTokenHash: string) => {
    return await prisma.session.updateMany({
      where: { refreshTokenHash, isRevoked: false },
      data: { isRevoked: true },
    });
  },

  revokeAllUserSessions: async (userId: string) => {
    return await prisma.session.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  },
};

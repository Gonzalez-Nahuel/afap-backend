import { prisma } from "@/lib/prisma";
import type {
  CreateSessionDTO,
  CreateVerificationTokenDto,
  RegisterUserDTO,
} from "./auth.dto";
import { string } from "zod";
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

  findByEmail: async (email: string) => {
    return await prisma.user.findUnique({ where: { email } });
  },

  createVerificationToken: async (
    token: string,
    userId: string,
    ttl: number,
  ) => {
    await redis.set(`token:verification:${token}`, userId, "EX", ttl);
  },

  getUserIdByToken: async (token: string) => {
    return await redis.get(`token:verification:${token}`);
  },

  verifyUserAccount: async (id: string) => {
    return await prisma.$transaction(async (tx) => {
      const userUpdated = await tx.user.update({
        where: { id },
        data: { isVerified: true },
        select: {
          id: true,
        },
      });

      await tx.verificationToken.deleteMany({ where: { userId: id } });

      return userUpdated;
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

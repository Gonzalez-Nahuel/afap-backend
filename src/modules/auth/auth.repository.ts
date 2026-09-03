import { prisma } from "@/lib/prisma.js";
import type {
  CreateSessionDTO,
  RegisterUserDTO,
  VerificationDataDto,
} from "./auth.dto.js";

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

  verifyUserAccount: async (id: string, email: string) => {
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

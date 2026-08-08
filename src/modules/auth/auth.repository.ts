import { prisma } from "@/lib/prisma";
import type {
  CreateSessionDTO,
  CreateVerificationTokenDto,
  RegisterUserDTO,
} from "./auth.dto";
import { string } from "zod";

export const authRepository = {
  createUser: async (
    data: RegisterUserDTO & {
      passwordHash: string;
    } & CreateVerificationTokenDto,
  ) => {
    return await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.passwordHash,
        verificationToken: {
          create: { tokenHash: data.tokenHash, expiresAt: data.expiresAt },
        },
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

  getVerificationToken: async (token: string) => {
    return await prisma.verificationToken.findUnique({
      where: { tokenHash: token },
    });
  },

  verifyUserAccount: async (id: string) => {},

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
};

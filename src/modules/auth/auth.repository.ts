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

  createSession: async (data: CreateSessionDTO) => {
    return await prisma.session.create({
      data: {
        userId: data.userId,
        hashRefresh: data.hashRefresh,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      },
    });
  },

  getSession: async (hashRefresh: string) => {
    return await prisma.session.findUnique({ where: { hashRefresh } });
  },

  revokeSession: async (hashRefresh: string) => {
    return await prisma.session.updateMany({
      where: { hashRefresh, isRevoked: false },
      data: { isRevoked: true },
    });
  },
};

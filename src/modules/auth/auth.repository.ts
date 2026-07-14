import { prisma } from "@/lib/prisma";
import type { RegisterUserDTO } from "./auth.dto";
import { string } from "zod";

export const authRepository = {
  findByEmail: async (email: string) => {
    return await prisma.user.findUnique({ where: { email } });
  },

  createUser: async (data: RegisterUserDTO & { passwordHash: string }) => {
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
};

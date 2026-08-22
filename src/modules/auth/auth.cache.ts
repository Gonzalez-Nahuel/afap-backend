import { redis } from "@/lib/redis";
import type { VerificationDataDto } from "./auth.dto";
import { email } from "zod";

export const authCache = {
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

  deleteUserVerifiedInCache: async (email: string) => {
    await redis.del(`user:status:verified:${email}`);
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

  deleteVerificationToken: async (email: string) => {
    return await redis.del(`auth:verification:${email}`);
  },
};

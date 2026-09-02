import { redis } from "@/lib/redis";
import type { SaveTokenDTO, VerificationDataDto } from "./auth.dto";
import { email } from "zod";

export const authCache = {
  createVerificationOtp: async (data: SaveTokenDTO) => {
    return await redis.set(
      `auth:verification:${data.email}`,
      JSON.stringify({
        token: data.token,
        userId: data.userId,
        attempts: data.attempts,
        retries: data.retries,
      }),
      "EX",
      data.ttl,
    );
  },

  lockResendVerificationOtp: async (email: string) => {
    return await redis.set(`lock:resend:${email}`, "1", "EX", 60);
  },

  canResendVerficationOtp: async (email: string) => {
    const exists = await redis.exists(`lock:resend:${email}`);

    return exists === 0;
  },

  lockVerificationOtpRetries: async (email: string) => {
    const ttl = 20 * 60;

    return await redis.set(`lock:verification:retries:${email}`, 1, "EX", ttl);
  },

  canRetryVerificationOtp: async (email: string) => {
    const exists = await redis.exists(`lock:verification:retries:${email}`);

    return exists === 0;
  },

  setVerificationShieldCache: async (email: string) => {
    const ttl = 60 * 15;

    await redis.set(`auth:verification:shield:${email}`, "1", "EX", ttl);
  },

  isVerificationShieldActive: async (email: string) => {
    const exists = await redis.exists(`auth:verification:shield:${email}`);

    return exists === 1;
  },

  deleteVerificationShieldCache: async (email: string) => {
    await redis.del(`auth:verification:shield:${email}`);
  },

  getVerificationOtpCache: async (email: string) => {
    return await redis.get(`auth:verification:${email}`);
  },

  incrementVerificationAttempts: async (
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

  deleteVerificationOtpCache: async (email: string) => {
    return await redis.del(`auth:verification:${email}`);
  },

  createResetPasswordLink: async (data: SaveTokenDTO) => {
    return await redis.set(
      `password:reset:${data.email}`,
      JSON.stringify({
        token: data.token,
        userId: data.userId,
        attempts: data.attempts,
        retries: data.retries,
      }),
      "EX",
      data.ttl,
    );
  },

  getResetPasswordLinkCache: async (email: string) => {
    return await redis.get(`password:reset:${email}`);
  },

  deleteResetPasswordLinkCache: async (email: string) => {
    return await redis.del(`password:reset:${email}`);
  },

  lockSendResetPasswordLink: async (email: string) => {
    return await redis.set(`lock:password:resend:${email}`, 1, "EX", 60);
  },

  canSendResetPasswordLink: async (email: string) => {
    const exists = await redis.exists(`lock:password:resend:${email}`);

    return exists === 0;
  },

  lockResetPasswordLinkRetries: async (email: string) => {
    const ttl = 20 * 60;

    return await redis.set(`lock:password:retries:${email}`, 1, "EX", ttl);
  },

  canRetryResetPasswordLink: async (email: string) => {
    const exists = await redis.exists(`lock:password:retries:${email}`);

    return exists === 0;
  },
};

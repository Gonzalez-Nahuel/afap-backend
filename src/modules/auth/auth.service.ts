import { AppError } from "@/lib/app-error";
import type {
  CreateSessionDTO,
  LoginUserDTO,
  RefreshDTO,
  RegisterUserDTO,
  VerificationDataDto,
} from "./auth.dto";
import { authRepository } from "./auth.repository";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  type UserPayload,
} from "@/lib/jwt";
import { hashToken } from "@/lib/hash-token";
import { generateOTP } from "@/lib/generate-otp-code";
import { sendEmail } from "@/lib/send-email";
import { resendVerifyTokenSchema } from "./auth.schema";
import { email } from "zod";
import { authCache } from "./auth.cache";

const DUMMY_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8s6VjWaVn2yXhH3pk.XUL8/l6nR1Aq";

export const authService = {
  registerUser: async (data: RegisterUserDTO) => {
    const userExists = await authRepository.findUserByEmail(data.email);
    if (userExists) {
      throw new AppError(409, "USER_EXISTS", "El email ya está registrado");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const otp = generateOTP();
    const tokenHash = hashToken(otp);
    const EXPIRATION_SECONDS = 15 * 60;

    const userPayload = {
      ...data,
      passwordHash,
    };

    const user = await authRepository.createUser(userPayload);

    await authCache.deleteUserVerifiedInCache(data.email);

    await authCache.createVerificationToken(
      data.email,
      tokenHash,
      user.id,
      EXPIRATION_SECONDS,
    );

    await authCache.lockResendOtp(data.email);

    await sendEmail(data.email, otp);

    return user;
  },

  verifyEmail: async (token: string, email: string) => {
    const tokenHash = hashToken(token);

    const verificationData = await authCache.getVerificationUserData(email);

    if (!verificationData)
      throw new AppError(
        404,
        "VERIFICATION_TOKEN_NOT_FOUND_OR_EXPIRED",
        "EL token de verificación no existe o ha expirado. Solicita uno nuevo",
      );

    const parsedVerificationData: VerificationDataDto =
      JSON.parse(verificationData);

    if (parsedVerificationData.attemps >= 5)
      throw new AppError(
        429,
        "TOO_MANY_ATTEMPS",
        "Has superado el límite de intentos permitidos. Solicita un nuevo código",
      );

    if (parsedVerificationData.token !== tokenHash) {
      await authCache.incrementVerificationAttemps(
        email,
        parsedVerificationData,
      );

      throw new AppError(
        401,
        "VERIFICATION_TOKEN_INVALID",
        "EL token de verificación es inválido",
      );
    }

    await authCache.deleteVerificationToken(email);

    await authRepository.verifyUserAccount(
      parsedVerificationData.userId,
      email,
    );

    return parsedVerificationData.userId;
  },

  resendOtp: async (email: string) => {
    const canResendOtp = await authCache.canResendOtp(email);

    if (!canResendOtp)
      throw new AppError(
        429,
        "TOO_MANY_REQUEST",
        "Por favor, espera 60 segundos antes de solicitar un nuevo código.",
      );

    const isAlreadyVerifiedInCache =
      await authCache.isAlreadyVerifiedInCache(email);

    if (isAlreadyVerifiedInCache) return;

    const otp = generateOTP();
    const tokenHash = hashToken(otp);
    const EXPIRATION_SECONDS = 15 * 60;

    const hasVerificationDataInCache =
      await authCache.getVerificationUserData(email);

    if (hasVerificationDataInCache) {
      const parsedVerificationData = JSON.parse(hasVerificationDataInCache);

      await authCache.createVerificationToken(
        email,
        tokenHash,
        parsedVerificationData.userId,
        EXPIRATION_SECONDS,
      );

      await authCache.lockResendOtp(email);

      await sendEmail(email, otp);

      return;
    }

    const user = await authRepository.findUserByEmail(email);

    if (!user || user.isVerified) {
      await authCache.setUserVerifiedInCache(email);

      return;
    }

    if (!user.isVerified) {
      await authCache.createVerificationToken(
        email,
        tokenHash,
        user.id,
        EXPIRATION_SECONDS,
      );

      await authCache.lockResendOtp(email);

      await sendEmail(email, otp);

      return;
    }

    return;
  },

  loginUser: async ({ body, ip, userAgent }: LoginUserDTO) => {
    const { email, password } = body;

    const userExist = await authRepository.findUserByEmail(email);

    const isPasswordValid = await bcrypt.compare(
      password,
      userExist?.password ?? DUMMY_HASH,
    );

    if (!userExist || !isPasswordValid)
      throw new AppError(401, "INVALID_CREDENTIALS", "Credenciales inválidas");

    if (!userExist.isVerified)
      throw new AppError(
        403,
        "USER_NOT_VERIFIED",
        "La cuenta aún no ha sido verificada. Verifíquela",
      );

    const user = {
      id: userExist.id,
      username: userExist.username,
    };

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const sessionData: CreateSessionDTO = {
      userId: user.id,
      refreshTokenHash,
      ipAddress: ip,
      userAgent,
      expiresAt,
    };

    await authRepository.createSession(sessionData);

    return { user, accessToken, refreshToken };
  },

  forgotPassword: async (email: string) => {},

  refresh: async ({ token, ip, userAgent }: RefreshDTO) => {
    if (!token)
      throw new AppError(401, "MISSING_TOKEN", "No se envio refreshToken");

    const verifiedToken = verifyRefreshToken(token) as UserPayload;

    const refreshTokenHash = hashToken(token);

    const session = await authRepository.getSession(refreshTokenHash);

    if (!session || session?.isRevoked) {
      if (session?.isRevoked) {
        await authRepository.revokeAllUserSessions(session.userId);
      }
      throw new AppError(401, "INVALID_SESSION", "sesión inválida o cerrada");
    }

    const now = Date.now();
    const expiresAtTime = session.expiresAt.getTime();

    if (now >= expiresAtTime)
      throw new AppError(401, "EXPIRED_SESSION", "La sesión ha expirado");

    await authRepository.revokeSession(refreshTokenHash);

    const { iat, exp, ...cleanPayload } = verifiedToken as any;

    const accessToken = generateAccessToken(cleanPayload);
    const newRefreshToken = generateRefreshToken(cleanPayload);

    const newRefreshTokenHash = hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const sessionData: CreateSessionDTO = {
      userId: session.userId,
      refreshTokenHash: newRefreshTokenHash,
      ipAddress: ip,
      userAgent,
      expiresAt,
    };

    await authRepository.createSession(sessionData);

    return { accessToken, newRefreshToken };
  },
  logout: async (refreshToken: string) => {
    const refreshTokenHash = hashToken(refreshToken);

    await authRepository.revokeSession(refreshTokenHash);

    return;
  },
};

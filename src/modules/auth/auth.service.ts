import { AppError } from "@/lib/app-error.js";
import type {
  CreateSessionDTO,
  LoginUserDTO,
  RefreshDTO,
  RegisterUserDTO,
  SaveTokenDTO,
  VerificationDataDto,
} from "./auth.dto.js";
import { authRepository } from "./auth.repository.js";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  type UserPayload,
} from "@/lib/jwt.js";
import { hashToken } from "@/lib/hash-token.js";
import { generateOTP } from "@/lib/generate-otp-code.js";
import {
  sendResetPasswordLink,
  sendVerificationOtp,
} from "@/lib/send-email.js";
import { resendVerifyTokenSchema } from "./auth.schema.js";
import { authCache } from "./auth.cache.js";

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

    await sendVerificationOtp(data.email, otp);

    const user = await authRepository.createUser(userPayload);

    const verificationPayload = {
      email: data.email,
      token: tokenHash,
      userId: user.id,
      attempts: 0,
      retries: 0,
      ttl: EXPIRATION_SECONDS,
    };

    await authCache.deleteVerificationShieldCache(data.email);

    await authCache.createVerificationOtp(verificationPayload);

    await authCache.lockResendVerificationOtp(data.email);

    return user;
  },

  verifyEmail: async (token: string, email: string) => {
    const tokenHash = hashToken(token);

    const verificationData = await authCache.getVerificationOtpCache(email);

    if (!verificationData)
      throw new AppError(
        404,
        "VERIFICATION_TOKEN_NOT_FOUND_OR_EXPIRED",
        "El código de verificación no existe o ha expirado. Solicita uno nuevo",
      );

    const parsedVerificationData: VerificationDataDto =
      JSON.parse(verificationData);

    if (parsedVerificationData.attempts >= 5)
      throw new AppError(
        429,
        "TOO_MANY_ATTEMPTS",
        "Has superado el límite de intentos permitidos. Solicita un nuevo código",
      );

    if (parsedVerificationData.token !== tokenHash) {
      await authCache.incrementVerificationAttempts(
        email,
        parsedVerificationData,
      );

      throw new AppError(
        401,
        "VERIFICATION_TOKEN_INVALID",
        "El código de verificación es inválido",
      );
    }

    await authCache.deleteVerificationOtpCache(email);

    await authRepository.verifyUserAccount(
      parsedVerificationData.userId,
      email,
    );

    return parsedVerificationData.userId;
  },

  resendOtp: async (email: string) => {
    const canResendOtp = await authCache.canResendVerficationOtp(email);

    if (!canResendOtp)
      throw new AppError(
        429,
        "TOO_MANY_REQUEST",
        "Por favor, espera 60 segundos antes de solicitar un nuevo código.",
      );

    const isUserVerified = await authCache.isVerificationShieldActive(email);

    if (isUserVerified) return;

    const canRetry = await authCache.canRetryVerificationOtp(email);

    if (!canRetry) return;

    const otp = generateOTP();
    const tokenHash = hashToken(otp);
    const EXPIRATION_SECONDS = 15 * 60;

    const hasVerificationDataInCache =
      await authCache.getVerificationOtpCache(email);

    if (hasVerificationDataInCache) {
      const parsedVerificationData: SaveTokenDTO = JSON.parse(
        hasVerificationDataInCache,
      );

      if (parsedVerificationData.retries >= 5) {
        await authCache.deleteVerificationOtpCache(email);

        await authCache.lockVerificationOtpRetries(email);

        return;
      }

      const verificationPayload = {
        email: email,
        token: tokenHash,
        userId: parsedVerificationData.userId,
        attempts: 0,
        retries: parsedVerificationData.retries + 1,
        ttl: EXPIRATION_SECONDS,
      };

      await authCache.createVerificationOtp(verificationPayload);

      await authCache.lockResendVerificationOtp(email);

      await sendVerificationOtp(email, otp);

      return;
    }

    const user = await authRepository.findUserByEmail(email);

    if (!user || user.isVerified) {
      await authCache.setVerificationShieldCache(email);

      return;
    }

    const verificationPayload = {
      email,
      token: tokenHash,
      userId: user.id,
      attempts: 0,
      retries: 0,
      ttl: EXPIRATION_SECONDS,
    };

    await authCache.createVerificationOtp(verificationPayload);

    await authCache.lockResendVerificationOtp(email);

    await sendVerificationOtp(email, otp);

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

  forgotPassword: async (email: string) => {
    const canSendLink = await authCache.canSendResetPasswordLink(email);

    if (!canSendLink)
      throw new AppError(
        429,
        "TOO_MANY_REQUEST",
        "Ya solicitaste un cambio de contraseña. Revisa tu correo o espera 60 segundos para solicitar uno nuevo.",
      );

    const canRetry = await authCache.canRetryResetPasswordLink(email);

    if (!canRetry) return;

    const token = crypto.randomUUID();
    const tokenHash = hashToken(token);
    const EXPIRATION_SECONDS = 15 * 60;

    const hasResetPasswordLinkDataInCache =
      await authCache.getResetPasswordLinkCache(email);

    if (hasResetPasswordLinkDataInCache) {
      const parsedResetData = JSON.parse(hasResetPasswordLinkDataInCache);

      if (parsedResetData.retries >= 5) {
        await authCache.lockResetPasswordLinkRetries(email);

        await authCache.deleteResetPasswordLinkCache(email);

        return;
      }

      const resetPasswordPayload = {
        email,
        token: tokenHash,
        userId: parsedResetData.userId,
        attempts: 0,
        retries: parsedResetData.retries + 1,
        ttl: EXPIRATION_SECONDS,
      };

      await authCache.createResetPasswordLink(resetPasswordPayload);

      await authCache.lockSendResetPasswordLink(email);

      await sendResetPasswordLink(email, token);

      return;
    }

    const userExists = await authRepository.findUserByEmail(email);

    if (!userExists || !userExists.isVerified) {
      await authCache.lockResetPasswordLinkRetries(email);

      return;
    }

    const resetPasswordPayload = {
      email,
      token: tokenHash,
      userId: userExists.id,
      attempts: 0,
      retries: 0,
      ttl: EXPIRATION_SECONDS,
    };

    await authCache.createResetPasswordLink(resetPasswordPayload);

    await authCache.lockSendResetPasswordLink(email);

    await sendResetPasswordLink(email, token);

    return;
  },

  me: async (user: UserPayload) => {
    const userPayload = {
      id: user.id,
      username: user.username,
    };

    return userPayload;
  },

  refresh: async ({ token, ip, userAgent }: RefreshDTO) => {
    if (!token)
      throw new AppError(401, "MISSING_TOKEN", "No se envió el refresh token");

    const verifiedToken = verifyRefreshToken(token) as UserPayload;

    const refreshTokenHash = hashToken(token);

    const session = await authRepository.getSession(refreshTokenHash);

    if (!session || session?.isRevoked) {
      if (session?.isRevoked) {
        await authRepository.revokeAllUserSessions(session.userId);
      }
      throw new AppError(401, "INVALID_SESSION", "Sesión inválida o cerrada");
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

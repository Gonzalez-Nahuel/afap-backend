import { AppError } from "@/lib/app-error";
import type {
  CreateSessionDTO,
  CreateVerificationTokenDto,
  LoginUserDTO,
  RefreshDTO,
  RegisterUserDTO,
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

const DUMMY_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8s6VjWaVn2yXhH3pk.XUL8/l6nR1Aq";

export const authService = {
  registerUser: async (data: RegisterUserDTO) => {
    const userExists = await authRepository.findByEmail(data.email);
    if (userExists) {
      throw new AppError(409, "USER_EXISTS", "El email ya está registrado");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const otp = generateOTP();
    const tokenHash = hashToken(otp);
    const EXPIRATION_SECONDS = 5 * 60;

    const userPayload = {
      ...data,
      passwordHash,
    };

    const user = await authRepository.createUser(userPayload);

    await authRepository.createVerificationToken(
      tokenHash,
      user.id,
      EXPIRATION_SECONDS,
    );

    await sendEmail(data.email, otp);

    return user;
  },

  verifyEmail: async (token: string) => {
    const tokenHash = hashToken(token);

    const userId = await authRepository.getUserIdByToken(tokenHash);

    if (!userId)
      throw new AppError(
        401,
        "VERIFICATION_TOKEN_INVALID_OR_EXPIRED",
        "EL token de verificación no existe o ha expirado",
      );

    await authRepository.verifyUserAccount(userId);

    return userId;
  },

  loginUser: async ({ body, ip, userAgent }: LoginUserDTO) => {
    const { email, password } = body;

    const userExist = await authRepository.findByEmail(email);

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
        "La cuenta aún no ha sido verificada",
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
  refresh: async ({ token, ip, userAgent }: RefreshDTO) => {
    if (!token)
      throw new AppError(401, "MISSING_TOKEN", "No se envio refreshToken");

    const verifiedToken = verifyRefreshToken(token) as UserPayload;

    const refreshTokenHash = hashToken(token);

    const session = await authRepository.getSession(refreshTokenHash);

    if (!session || session?.isRevoked) {
      if (session?.isRevoked) {
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

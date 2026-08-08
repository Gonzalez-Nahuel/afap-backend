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
    const userExist = await authRepository.findByEmail(data.email);
    if (userExist) {
      throw new AppError(400, "El email ya está registrado");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const otp = generateOTP();
    const tokenHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const userPayload = {
      ...data,
      passwordHash,
      tokenHash,
      expiresAt,
    };

    const user = await authRepository.createUser(userPayload);

    await sendEmail(data.email, otp);

    return user;
  },

  verifyEmail: async (token: string) => {
    const tokenHash = hashToken(token);

    const isTokenValid = await authRepository.getVerificationToken(tokenHash);

    const now = Date.now();

    if (!isTokenValid || now > isTokenValid.expiresAt.getTime())
      throw new AppError(
        401,
        "EL token de verificación no existe o ha expirado",
      );
  },

  loginUser: async ({ body, ip, userAgent }: LoginUserDTO) => {
    const { email, password } = body;

    const userExist = await authRepository.findByEmail(email);

    const isPasswordValid = await bcrypt.compare(
      password,
      userExist?.password ?? DUMMY_HASH,
    );

    if (!userExist || !isPasswordValid)
      throw new AppError(401, "Credenciales inválidas");

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
    if (!token) throw new AppError(401, "No se envio refreshToken");

    const verifiedToken = verifyRefreshToken(token) as UserPayload;

    const refreshTokenHash = hashToken(token);

    const session = await authRepository.getSession(refreshTokenHash);

    if (!session || session?.isRevoked)
      throw new AppError(401, "sesión inválida o cerrada");

    const now = Date.now();
    const exipresAt = session.expiresAt.getTime();

    if (now >= exipresAt) throw new AppError(401, "La sesión ha expirado");

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

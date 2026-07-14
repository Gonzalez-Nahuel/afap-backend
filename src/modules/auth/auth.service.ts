import { AppError } from "@/lib/app-error";
import type { LoginUserDTO, RegisterUserDTO } from "./auth.dto";
import { authRepository } from "./auth.repository";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";

const DUMMY_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8s6VjWaVn2yXhH3pk.XUL8/l6nR1Aq";

export const authService = {
  registerUser: async (data: RegisterUserDTO) => {
    const userExist = await authRepository.findByEmail(data.email);
    if (userExist) {
      throw new AppError(400, "El email ya está registrado");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = {
      ...data,
      passwordHash,
    };
    const newUser = await authRepository.createUser(user);

    return newUser;
  },
  loginUser: async (data: LoginUserDTO) => {
    const { email, password } = data;

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

    return { user, accessToken, refreshToken };
  },
};

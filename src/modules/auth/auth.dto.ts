import type z from "zod";
import type { loginUserSchema, registerUserSchema } from "./auth.schema";

export interface VerificationDataDto {
  token: string;
  userId: string;
  attemps: number;
}

export type RegisterUserDTO = z.infer<typeof registerUserSchema>["body"];

export type LoginUserSchemaType = z.infer<typeof loginUserSchema>;

export interface ClientInfoDTO {
  ip: string;
  userAgent: string;
}

export interface LoginUserDTO extends ClientInfoDTO {
  body: LoginUserSchemaType["body"];
}

export interface RefreshDTO extends ClientInfoDTO {
  token: string;
}

export interface CreateSessionDTO {
  userId: string;
  refreshTokenHash: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: Date;
}

export interface SaveTokenDTO {
  email: string;
  token: string;
  userId: string;
  attempts: number;
  retries: number;
  ttl: number;
}

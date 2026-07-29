import z from "zod";
import type { loginUserSchema, registerUserSchema } from "./auth.schema";

export type RegisterUserDTO = z.infer<typeof registerUserSchema>["body"];

export type LoginUserSchemaType = z.infer<typeof loginUserSchema>;

export interface LoginUserDTO {
  body: LoginUserSchemaType["body"];
  ip: string;
  userAgent: string;
}

export interface CreateSessionDTO {
  userId: string;
  hashRefresh: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: Date;
}

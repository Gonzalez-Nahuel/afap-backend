import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.url("DATABASE_URL debe ser una URL válida"),
  JWT_ACCESS_TOKEN_SECRET: z
    .string()
    .min(10, "El secreto de Access Token es muy corto"),
  JWT_REFRESH_TOKEN_SECRET: z
    .string()
    .min(10, "El secreto de Refresh Token es muy corto"),
  ACCESS_TOKEN_EXPIRES: z.enum(["15m"]),
  REFRESH_TOKEN_EXPIRES: z.enum(["7d"]),
  RESEND_API_KEY: z.string(),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);

import z from "zod";
import type { loginUserSchema, registerUserSchema } from "./auth.schema";

export type RegisterUserDTO = z.infer<typeof registerUserSchema>["body"];

export type LoginUserDTO = z.infer<typeof loginUserSchema>["body"];

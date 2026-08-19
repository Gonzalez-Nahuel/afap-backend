import { email, z } from "zod";

export const registerUserSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(6, { error: "El usuario debe tener al menos 6 caracteres" })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "El usuario solo permite letras, números y guiones bajos",
      })
      .max(50, "El usuario es demasiado largo"),

    email: z
      .email({ error: "Formato de correo electrónico inválido" })
      .trim()
      .toLowerCase()
      .max(80, "El email es demasiado largo"),

    password: z
      .string()
      .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
      .regex(/[A-Z]/, { message: "Debe contener al menos una letra mayúscula" })
      .regex(/[a-z]/, { message: "Debe contener al menos una letra minúscula" })
      .regex(/[0-9]/, { message: "Debe contener al menos un número" })
      .regex(/[^a-zA-Z0-9]/, {
        message: "Debe contener al menos un carácter especial",
      })
      .max(100, "La contraseña es demasiado larga"),
  }),
});

const clientTypeHeaderSchema = z.object({
  "x-client-type": z.enum(["web", "mobile"], {
    error: "X-Client-type debe ser 'web' o 'mobile'",
  }),
});

export const loginUserSchema = z.object({
  headers: clientTypeHeaderSchema,
  body: z.object({
    email: z
      .email({ error: "Formato de correo electrónico inválido" })
      .max(80, "El email es demasiado largo")
      .trim()
      .toLowerCase(),
    password: z.string().min(1).max(100),
  }),
});

export const refreshTokenSchema = z.object({
  headers: clientTypeHeaderSchema,
  body: z.object({ refreshToken: z.string().optional() }).optional(),
});

export const logoutSchema = z.object({
  headers: clientTypeHeaderSchema,
  body: z.object({ refreshToken: z.string().optional() }).optional(),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z
      .email({ error: "Formato de correo electrónico inválido" })
      .max(80, "El email es demasiado largo")
      .trim()
      .toLowerCase(),
    token: z
      .string()
      .min(6, "El código debe tener 6 dígitos")
      .max(6, "El código debe tener 6 dígitos"),
  }),
});

export const resendVerifyTokenSchema = z.object({
  body: z.object({
    email: z
      .email({ error: "Formato de correo electrónico inválido" })
      .max(80, "El email es demasiado largo")
      .trim()
      .toLowerCase(),
  }),
});

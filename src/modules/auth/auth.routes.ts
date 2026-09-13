import { asyncHandler } from "@/middlewares/async-handler.js";
import { authMiddleware } from "@/middlewares/auth.middleware.js";
import { validate } from "@/middlewares/validate.middleware.js";
import { Router } from "express";
import { authController } from "./auth.controller.js";
import {
  forgotPasswordSchema,
  loginUserSchema,
  logoutSchema,
  refreshTokenSchema,
  registerUserSchema,
  resendVerifyTokenSchema,
  verifyEmailSchema,
} from "./auth.schema.js";

export const authRouter = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar un usuario
 *     description: |
 *       Crea una cuenta no verificada y envía un código OTP al email indicado.
 *       El código vence a los 15 minutos y debe confirmarse con `verify-email`.
 *     operationId: registerUser
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RegisterRequest"
 *     responses:
 *       "200":
 *         description: Usuario creado y código de verificación enviado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RegisterResponse"
 *       "400":
 *         $ref: "#/components/responses/ValidationError"
 *       "409":
 *         $ref: "#/components/responses/Conflict"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 *       "502":
 *         $ref: "#/components/responses/EmailDeliveryError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
authRouter.post(
  "/register",
  validate(registerUserSchema),
  asyncHandler(authController.register),
);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verificar el email
 *     description: |
 *       Valida el OTP de seis dígitos enviado durante el registro y activa la cuenta.
 *       Después de cinco intentos fallidos se bloquea el código actual.
 *     operationId: verifyEmail
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/VerifyEmailRequest"
 *     responses:
 *       "200":
 *         description: Cuenta verificada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MessageResponse"
 *             example:
 *               ok: true
 *               message: Usuario verificado con éxito
 *       "400":
 *         $ref: "#/components/responses/ValidationError"
 *       "401":
 *         $ref: "#/components/responses/InvalidVerificationToken"
 *       "404":
 *         $ref: "#/components/responses/NotFound"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
authRouter.post(
  "/verify-email",
  validate(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Reenviar el código de verificación
 *     description: |
 *       Genera un OTP nuevo para una cuenta pendiente de verificación.
 *       La respuesta no revela si el email existe o si la cuenta ya está verificada.
 *       Se permite una solicitud por minuto y hasta cinco reenvíos.
 *     operationId: resendVerificationOtp
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/EmailRequest"
 *     responses:
 *       "200":
 *         description: Solicitud procesada sin revelar el estado de la cuenta.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MessageResponse"
 *             example:
 *               ok: true
 *               message: Si el correo está registrado, se ha enviado un nuevo código
 *       "400":
 *         $ref: "#/components/responses/ValidationError"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 *       "502":
 *         $ref: "#/components/responses/EmailDeliveryError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
authRouter.post(
  "/resend-otp",
  validate(resendVerifyTokenSchema),
  asyncHandler(authController.resendOtp),
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     description: |
 *       Valida las credenciales y crea una sesión persistente de siete días.
 *       Para `web`, el refresh token se entrega como cookie httpOnly y no aparece en el JSON.
 *       Para `mobile`, se devuelven access token y refresh token en el cuerpo.
 *     operationId: login
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/ClientTypeHeader"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/LoginRequest"
 *     responses:
 *       "200":
 *         description: Sesión iniciada.
 *         headers:
 *           Set-Cookie:
 *             description: Solo para web. Cookie httpOnly que contiene el refresh token.
 *             schema:
 *               type: string
 *               example: refreshToken=eyJ...; Max-Age=604800; Path=/; HttpOnly; SameSite=Strict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LoginResponse"
 *       "400":
 *         $ref: "#/components/responses/ValidationError"
 *       "401":
 *         $ref: "#/components/responses/InvalidCredentials"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
authRouter.post(
  "/login",
  validate(loginUserSchema),
  asyncHandler(authController.login),
);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicitar recuperación de contraseña
 *     description: |
 *       Envía un enlace de recuperación de un solo uso que vence a los 15 minutos.
 *       La respuesta no revela si el email existe ni si su cuenta está verificada.
 *       Se permite una solicitud por minuto y hasta cinco reenvíos.
 *     operationId: requestPasswordReset
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/EmailRequest"
 *     responses:
 *       "200":
 *         description: Solicitud procesada sin revelar el estado de la cuenta.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MessageResponse"
 *             example:
 *               ok: true
 *               message: Si el correo está registrado, se ha enviado el enlace de recuperación a su email
 *       "400":
 *         $ref: "#/components/responses/ValidationError"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 *       "502":
 *         $ref: "#/components/responses/EmailDeliveryError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
authRouter.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Obtener el usuario autenticado
 *     description: Devuelve la identidad pública contenida en el access token.
 *     operationId: getAuthenticatedUser
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Usuario autenticado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthenticatedUserResponse"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
authRouter.get("/me", authMiddleware, asyncHandler(authController.me));

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar la sesión
 *     description: |
 *       Rota el refresh token: revoca la sesión anterior y crea una nueva.
 *       Para `web`, lee y reemplaza la cookie httpOnly. Para `mobile`, lee el token del body
 *       y devuelve el nuevo refresh token junto con el access token.
 *     operationId: refreshSession
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/ClientTypeHeader"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RefreshTokenRequest"
 *     responses:
 *       "200":
 *         description: Tokens renovados y sesión rotada.
 *         headers:
 *           Set-Cookie:
 *             description: Solo para web. Reemplaza la cookie del refresh token.
 *             schema:
 *               type: string
 *               example: refreshToken=eyJ...; Max-Age=604800; Path=/; HttpOnly; SameSite=Strict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RefreshResponse"
 *       "400":
 *         $ref: "#/components/responses/ValidationError"
 *       "401":
 *         $ref: "#/components/responses/InvalidRefreshToken"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
authRouter.post(
  "/refresh",
  validate(refreshTokenSchema),
  asyncHandler(authController.refresh),
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión
 *     description: |
 *       Revoca la sesión asociada al refresh token cuando está presente.
 *       Para `web`, además elimina la cookie. La operación es idempotente: también devuelve
 *       éxito cuando no se envía un refresh token.
 *     operationId: logout
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/ClientTypeHeader"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RefreshTokenRequest"
 *     responses:
 *       "200":
 *         description: Sesión cerrada o solicitud ya satisfecha.
 *         headers:
 *           Set-Cookie:
 *             description: Solo para web. Elimina la cookie del refresh token.
 *             schema:
 *               type: string
 *               example: refreshToken=; Path=/; HttpOnly; SameSite=Strict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LogoutResponse"
 *       "400":
 *         $ref: "#/components/responses/ValidationError"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
authRouter.post(
  "/logout",
  validate(logoutSchema),
  asyncHandler(authController.logout),
);

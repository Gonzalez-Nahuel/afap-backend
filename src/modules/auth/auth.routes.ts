import { asyncHandler } from "@/middlewares/async-handler";
import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "@/middlewares/validate.middleware";
import {
  loginUserSchema,
  logoutSchema,
  refreshTokenSchema,
  registerUserSchema,
  resendVerifyTokenSchema,
  verifyEmailSchema,
} from "./auth.schema";
import { authMiddleware } from "@/middlewares/auth.middleware";

export const authRouter = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Registrar un nuevo usuario
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 50
 *                 pattern: "^[a-zA-Z0-9_]+$"
 *                 example: "pepe_12"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 80
 *                 example: "pepe@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 100
 *                 example: "SecureP@ss123"
 *     responses:
 *       "200":
 *         description: Registro exitoso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - user
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   required:
 *                     - id
 *                     - username
 *                     - email
 *                     - createdAt
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       "400":
 *         description: Error de validación de Zod.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *                 - errors
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *                 message:
 *                   type: string
 *                   example: Error de validación
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required:
 *                       - field
 *                       - message
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       "409":
 *         description: El email ya está registrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: USER_EXISTS
 *                 message:
 *                   type: string
 *                   example: El email ya está registrado
 *       "502":
 *         description: Solo si falla `sendEmail()` al intentar enviar el código de verificación.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: EMAIL_SEND_ERROR
 *                 message:
 *                   type: string
 *                   example: No se pudo enviar el email, reenviar el código
 *       "500":
 *         description: Error inesperado del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: UNKNOWN_ERROR
 *                 message:
 *                   type: string
 *                   example: Internal server error
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
 *     tags:
 *       - Auth
 *     summary: Verificar el email del usuario
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - token
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 80
 *               token:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       "200":
 *         description: Verificación exitosa.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Usuario verificado con éxito
 *       "400":
 *         description: Error de validación del body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *                 - errors
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *                 message:
 *                   type: string
 *                   example: Error de validación
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       "401":
 *         description: El código de verificación es inválido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: VERIFICATION_TOKEN_INVALID
 *                 message:
 *                   type: string
 *                   example: EL token de verificación es inválido
 *       "404":
 *         description: El token de verificación no existe o expiró.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: VERIFICATION_TOKEN_NOT_FOUND_OR_EXPIRED
 *                 message:
 *                   type: string
 *                   example: EL token de verificación no existe o ha expirado. Solicita uno nuevo
 *       "429":
 *         description: Se excedió el límite de intentos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: TOO_MANY_ATTEMPS
 *                 message:
 *                   type: string
 *                   example: Has superado el límite de intentos permitidos. Solicita un nuevo código
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
 *     tags:
 *       - Auth
 *     summary: Reenviar código de verificación
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 80
 *     responses:
 *       "200":
 *         description: Reenvío exitoso o respuesta silenciosa cuando el correo no existe o ya está verificado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Si el correo está registrado, se ha enviado un nuevo código
 *       "400":
 *         description: Error de validación del body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *                 - errors
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *                 message:
 *                   type: string
 *                   example: Error de validación
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       "429":
 *         description: El usuario solicitó un nuevo código demasiado pronto.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: TOO_MANY_REQUEST
 *                 message:
 *                   type: string
 *                   example: Por favor, espera 60 segundos antes de solicitar un nuevo código.
 *       "502":
 *         description: No se pudo enviar el email de verificación.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: EMAIL_SEND_ERROR
 *                 message:
 *                   type: string
 *                   example: No se pudo enviar el email, reenviar el código
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
 *     tags:
 *       - Auth
 *     summary: Iniciar sesión
 *     security: []
 *     parameters:
 *       - in: header
 *         name: x-client-type
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - web
 *             - mobile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 80
 *               password:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *     responses:
 *       "200":
 *         description: Inicio de sesión exitoso.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Solo en cliente web; se guarda la cookie refreshToken.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - user
 *                     - accessToken
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       type: object
 *                       required:
 *                         - id
 *                         - username
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                     accessToken:
 *                       type: string
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - user
 *                     - accessToken
 *                     - refreshToken
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       type: object
 *                       required:
 *                         - id
 *                         - username
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       "400":
 *         description: Error de validación del header o del body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *                 - errors
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *                 message:
 *                   type: string
 *                   example: Error de validación
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       "401":
 *         description: Credenciales inválidas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: INVALID_CREDENTIALS
 *                 message:
 *                   type: string
 *                   example: Credenciales inválidas
 *       "403":
 *         description: La cuenta no está verificada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: USER_NOT_VERIFIED
 *                 message:
 *                   type: string
 *                   example: La cuenta aún no ha sido verificada
 */
authRouter.post(
  "/login",
  validate(loginUserSchema),
  asyncHandler(authController.login),
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Obtener información del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Usuario autenticado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - user
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   required:
 *                     - id
 *                     - username
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *       "401":
 *         description: Token requerido o inválido.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - code
 *                     - message
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: MISSING_TOKEN
 *                     message:
 *                       type: string
 *                       example: Token requerido
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - code
 *                     - message
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: INVALID_TOKEN
 *                     message:
 *                       type: string
 *                       example: Token inválido
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - code
 *                     - message
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: TOKEN_EXPIRED_ERROR
 *                     message:
 *                       type: string
 *                       example: El token ha expirado
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - code
 *                     - message
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: TOKEN_ERROR
 *                     message:
 *                       type: string
 *                       example: Token inválido o mal formado
 */
authRouter.get("/me", authMiddleware, asyncHandler(authController.me));

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Renovar tokens
 *     security: []
 *     parameters:
 *       - in: header
 *         name: x-client-type
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - web
 *             - mobile
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Refresh exitoso.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Solo para cliente web; se reemplaza la cookie refreshToken.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - accessToken
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: true
 *                     accessToken:
 *                       type: string
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - accessToken
 *                     - refreshToken
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: true
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       "400":
 *         description: Error de validación del header o del body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *                 - errors
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *                 message:
 *                   type: string
 *                   example: Error de validación
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       "401":
 *         description: Refresh token ausente o sesión inválida/expirada.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - code
 *                     - message
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: MISSING_TOKEN
 *                     message:
 *                       type: string
 *                       example: No se envio refreshToken
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - code
 *                     - message
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: INVALID_SESSION
 *                     message:
 *                       type: string
 *                       example: sesión inválida o cerrada
 *                 - type: object
 *                   required:
 *                     - ok
 *                     - code
 *                     - message
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: EXPIRED_SESSION
 *                     message:
 *                       type: string
 *                       example: La sesión ha expirado
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
 *     tags:
 *       - Auth
 *     summary: Cerrar sesión
 *     security: []
 *     parameters:
 *       - in: header
 *         name: x-client-type
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - web
 *             - mobile
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Cierre de sesión exitoso.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Solo para cliente web; elimina la cookie refreshToken.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       "400":
 *         description: Error de validación del header o del body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - code
 *                 - message
 *                 - errors
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *                 message:
 *                   type: string
 *                   example: Error de validación
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 */
authRouter.post(
  "/logout",
  validate(logoutSchema),
  asyncHandler(authController.logout),
);

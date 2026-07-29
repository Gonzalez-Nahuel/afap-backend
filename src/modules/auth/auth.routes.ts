import { asyncHandler } from "@/middlewares/async-handler";
import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "@/middlewares/validate.middleware";
import {
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
} from "./auth.schema";
import { authMiddleware } from "@/middlewares/auth.middleware";

export const authRouter = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     description: |
 *       Crea una cuenta en la plataforma de forma segura.
 *       La contraseña se encripta de forma asíncrona antes de almacenarse en la base de datos.
 *     tags:
 *       - Auth
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
 *                 example: "pepe_g"
 *                 description: Debe tener entre 6 y 50 caracteres. Solo se admiten letras, números y guiones bajos.
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 80
 *                 example: "pepe.dev@example.com"
 *                 description: Dirección de correo electrónico única y válida.
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 100
 *                 example: "SecureP@ss123"
 *                 description: |
 *                   Debe cumplir con los siguientes requisitos de complejidad:
 *                   - Mínimo 8 y máximo 100 caracteres.
 *                   - Al menos una letra mayúscula.
 *                   - Al menos una letra minúscula.
 *                   - Al menos un número.
 *                   - Al menos un carácter especial.
 *     responses:
 *       200:
 *         description: Usuario registrado y guardado exitosamente en la base de datos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Error en la validación de los datos (ZodError) o conflicto lógico (email duplicado).
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Error inesperado en el servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

authRouter.post(
  "/register",
  validate(registerUserSchema),
  asyncHandler(authController.register),
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: |
 *       Autentica un usuario con sus credenciales y devuelve un token de acceso.
 *       La respuesta varía según el tipo de cliente especificado en el header 'x-client-type':
 *       - Para clientes web: devuelve accessToken en la respuesta y refreshToken en una cookie HttpOnly.
 *       - Para clientes móviles: devuelve accessToken y refreshToken en la respuesta JSON.
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: header
 *         name: x-client-type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [web, mobile]
 *         description: Tipo de cliente realizando la solicitud (web o mobile).
 *         example: web
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
 *                 example: "pepe.dev@example.com"
 *                 description: Dirección de correo electrónico registrada en la plataforma.
 *               password:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "SecureP@ss123"
 *                 description: Contraseña de la cuenta del usuario.
 *     responses:
 *       200:
 *         description: Autenticación exitosa. El usuario ha iniciado sesión correctamente.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Solo para clientes web. Contiene el refreshToken en una cookie HttpOnly, segura y con sameSite=strict.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Respuesta para clientes web (sin refreshToken en el body).
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       description: Token JWT para autenticar futuras solicitudes. Válido por 15 minutos.
 *                   required:
 *                     - user
 *                     - accessToken
 *                 - type: object
 *                   description: Respuesta para clientes móviles (con refreshToken en el body).
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       description: Token JWT para autenticar futuras solicitudes. Válido por 15 minutos.
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       description: Token para renovar el accessToken cuando expire. Válido por 7 días.
 *                   required:
 *                     - user
 *                     - accessToken
 *                     - refreshToken
 *       400:
 *         description: Error en la validación de los datos (ZodError) o credenciales inválidas.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/ApiError'
 *             examples:
 *               validationError:
 *                 summary: Error de validación
 *                 value:
 *                   ok: false
 *                   message: "Error de validación"
 *                   errors:
 *                     - field: "body.email"
 *                       message: "Formato de correo electrónico inválido"
 *               invalidCredentials:
 *                 summary: Credenciales inválidas
 *                 value:
 *                   ok: false
 *                   message: "Credenciales Inválidas"
 *               invalidClientType:
 *                 summary: Tipo de cliente inválido
 *                 value:
 *                   ok: false
 *                   message: "Error de validación"
 *                   errors:
 *                     - field: "headers.x-client-type"
 *                       message: "X-Client-type debe ser 'web' o 'mobile'"
 *       500:
 *         description: Error inesperado en el servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
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
 *     summary: Obtener información del usuario autenticado
 *     description: |
 *       Devuelve los datos del usuario actualmente autenticado.
 *       Requiere un token de acceso válido en el header Authorization con formato: Bearer <accessToken>
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario obtenida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Error de autenticación. Token no incluido, inválido, expirado o mal formado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenError'
 *             examples:
 *               noToken:
 *                 summary: Token no incluido en el header
 *                 value:
 *                   ok: false
 *                   message: "No autorizado"
 *               expiredToken:
 *                 summary: Token expirado
 *                 value:
 *                   ok: false
 *                   message: "El token ha expirado"
 *               invalidToken:
 *                 summary: Token inválido o mal formado
 *                 value:
 *                   ok: false
 *                   message: "Token inválido o mal formado"
 *       500:
 *         description: Error inesperado en el servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
authRouter.get("/me", authMiddleware, asyncHandler(authController.me));

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar tokens de autenticación
 *     description: |
 *       Renueva el accessToken cuando este haya expirado.
 *       También renueva el refreshToken en cada solicitud.
 *       Para clientes web, el refreshToken se lee desde una cookie HttpOnly.
 *       Para clientes móviles, el refreshToken se envía en el body de la solicitud.
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: header
 *         name: x-client-type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [web, mobile]
 *         description: Tipo de cliente que solicita la renovación de tokens.
 *         example: web
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 description: Refresh token enviado por clientes móviles.
 *     responses:
 *       200:
 *         description: Access token y refresh token renovados correctamente.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Solo para clientes web. Nueva cookie HttpOnly con el refreshToken.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Respuesta para clientes web.
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       description: Nuevo token JWT de acceso válido por 15 minutos.
 *                   required:
 *                     - accessToken
 *                 - type: object
 *                   description: Respuesta para clientes móviles.
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       description: Nuevo token JWT de acceso válido por 15 minutos.
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       description: Nuevo refreshToken para el cliente móvil.
 *                   required:
 *                     - accessToken
 *                     - refreshToken
 *       400:
 *         description: Error de validación en la cabecera o en el body de la solicitud.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/ApiError'
 *             examples:
 *               missingClientType:
 *                 summary: Falta x-client-type en la cabecera
 *                 value:
 *                   ok: false
 *                   message: "Error de validación"
 *                   errors:
 *                     - field: "headers.x-client-type"
 *                       message: "X-Client-type debe ser 'web' o 'mobile'"
 *       401:
 *         description: Refresh token inválido, expirado, ausente o no autorizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenError'
 *             examples:
 *               missingRefreshTokenWeb:
 *                 summary: Falta refreshToken en la cookie para cliente web
 *                 value:
 *                   ok: false
 *                   message: "No se envio refreshToken"
 *               invalidRefreshToken:
 *                 summary: Refresh token inválido o expirado
 *                 value:
 *                   ok: false
 *                   message: "Refresh token inválido"
 *       500:
 *         description: Error inesperado en el servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
authRouter.post(
  "/refresh",
  validate(refreshTokenSchema),
  asyncHandler(authController.refresh),
);

authRouter.post("/logout", authMiddleware, asyncHandler(authController.logout));

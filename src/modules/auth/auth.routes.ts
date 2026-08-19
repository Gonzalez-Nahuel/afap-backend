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
 *     summary: Registrar un nuevo usuario
 *     description: |
 *       Endpoint de registro clásico para crear una cuenta con `username`, `email` y `password`.
 *       El middleware `validate` aplica el schema Zod de registro al `body` con los campos requeridos antes de llegar al handler.
 *       En el servicio se verifica si el correo ya existe en Prisma; si existe, se lanza un error de conflicto con el mensaje `El email ya está registrado`.
 *       Si no existe, se aplica `bcrypt.hash` sobre la contraseña, se genera un OTP y se guarda el código temporal en Redis usando la clave `token:verification:<hash>` con TTL de 5 minutos.
 *       Luego se crea el usuario y se envía el código al correo mediante `Resend`.
 *       El registro no devuelve tokens ni crea una sesión activa: solo devuelve el perfil público del usuario recién creado.
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
 *                 description: Nombre visible del usuario. Debe tener entre 6 y 50 caracteres y aceptar solo letras, números y guiones bajos.
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 80
 *                 example: "pepe.dev@example.com"
 *                 description: Dirección de correo electrónico única y válida. El valor se normaliza a minúsculas antes de consultarse.
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 100
 *                 example: "SecureP@ss123"
 *                 description: |
 *                   Contraseña con complejidad requerida:
 *                   - Al menos 8 caracteres.
 *                   - Al menos una letra mayúscula.
 *                   - Al menos una letra minúscula.
 *                   - Al menos un número.
 *                   - Al menos un carácter especial.
 *     responses:
 *       200:
 *         description: Registro exitoso. La respuesta pública incluye id, username, email y createdAt, y siempre devuelve `ok: true`.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/UserResponse'
 *               required:
 *                 - ok
 *                 - user
 *       400:
 *         description: |
 *           Error de entrada o conflicto lógico.
 *           Puede venir de Zod (`Error de validación`) o del servicio cuando el email ya existe (`El email ya está registrado`).
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/ApiError'
 *             examples:
 *               validation:
 *                 summary: Validación del cuerpo
 *                 value:
 *                   ok: false
 *                   message: "Error de validación"
 *                   errors:
 *                     - field: "body.email"
 *                       message: "Formato de correo electrónico inválido"
 *               duplicateEmail:
 *                 summary: Email duplicado
 *                 value:
 *                   ok: false
 *                   message: "El email ya está registrado"
 *       502:
 *         description: El email de verificación no pudo enviarse a través de Resend. La capa de servicio lo reporta como error de gateway de correo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               ok: false
 *               message: "No se pudo enviar el email, reenviar el código"
 *       500:
 *         description: Error inesperado del servidor o falla persistente de Prisma al crear el usuario.
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
 * /api/auth/verify-email:
 *   post:
 *     summary: Verificar el email del usuario
 *     description: |
 *       Valida el código OTP enviado por email durante el registro.
 *       Si el código coincide y aún no expiró, se activa la cuenta del usuario.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "123456"
 *                 description: Código de verificación de 6 dígitos enviado al correo del usuario.
 *     responses:
 *       200:
 *         description: El email fue verificado correctamente y la respuesta incluye `ok: true`.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 userId:
 *                   type: string
 *                   example: "clx123abc"
 *               required:
 *                 - ok
 *                 - userId
 *       400:
 *         description: Error de validación del código de verificación.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: El token de verificación es inválido o expiró.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
authRouter.post(
  "/verify-email",
  validate(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);

authRouter.post(
  "/resend-otp",
  validate(resendVerifyTokenSchema),
  asyncHandler(authController.resendOtp),
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: |
 *       Autentica un usuario con sus credenciales y devuelve el par de tokens necesario para mantener la sesión.
 *       El comportamiento depende del header `x-client-type`:
 *       - `web`: devuelve el `accessToken` en el body y guarda el `refreshToken` en una cookie `HttpOnly` llamada `refreshToken`.
 *       - `mobile`: devuelve `accessToken` y `refreshToken` en el body de la respuesta JSON.
 *
 *       La sesión real se guarda en Prisma en el modelo `Session`: se almacena el `refreshTokenHash`, `userAgent`, `ipAddress`, `expiresAt` y `isRevoked`.
 *       El refresh token en bruto nunca se guarda en base de datos; solo se guarda su hash generado con `hashToken`.
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: header
 *         name: x-client-type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [web, mobile]
 *         description: Tipo de cliente realizando la solicitud. El flujo difiere entre navegador y aplicación móvil.
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
 *         description: Autenticación exitosa. La respuesta incluye `ok: true` y el payload de sesión adecuado para cada cliente.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Solo para clientes web. Guarda el refreshToken en una cookie `HttpOnly` con `sameSite=strict` y duración de 7 días.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Respuesta para clientes web.
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       description: Token JWT para autenticar futuras solicitudes. Válido por 15 minutos.
 *                   required:
 *                     - ok
 *                     - user
 *                     - accessToken
 *                 - type: object
 *                   description: Respuesta para clientes móviles.
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: true
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
 *                     - ok
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
 *         description: Información del usuario obtenida exitosamente. La respuesta incluye `ok: true`.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/UserResponse'
 *               required:
 *                 - ok
 *                 - user
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
 *       Renueva el `accessToken` y, en cada solicitud, rota también el `refreshToken`.
 *       La forma de leer el token depende del cliente:
 *       - `web`: el refresh se toma desde la cookie `refreshToken` y la nueva cookie se reemplaza por la nueva sesión.
 *       - `mobile`: el refresh se envía en el body del request y el nuevo refresh se devuelve en el JSON.
 *
 *       La sesión anterior se revoca y se crea una nueva sesión con el `refreshTokenHash` actualizado, el `ipAddress` y el `userAgent` actuales.
 *       Si un refresh token ya revocado se reutiliza, el backend detecta la sesión invalidada, revoca todas las sesiones del usuario y responde con `401` para mitigar la reutilización de tokens.
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
 *                 description: Refresh token enviado por clientes móviles. Este campo es opcional para web, porque el valor se toma desde la cookie.
 *     responses:
 *       200:
 *         description: Access token y refresh token renovados correctamente. La respuesta incluye `ok: true`.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Solo para clientes web. Reemplaza la cookie `refreshToken` por el nuevo refresh rotado.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Respuesta para clientes web.
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: true
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       description: Nuevo token JWT de acceso válido por 15 minutos.
 *                   required:
 *                     - ok
 *                     - accessToken
 *                 - type: object
 *                   description: Respuesta para clientes móviles.
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: true
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       description: Nuevo token JWT de acceso válido por 15 minutos.
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       description: Nuevo refreshToken para el cliente móvil.
 *                   required:
 *                     - ok
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

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: |
 *       Finaliza la sesión actual invalidando la sesión asociada al `refreshToken`.
 *       El endpoint no necesita el `accessToken` en el header para cerrar sesión.
 *       El flujo depende del cliente:
 *       - `web`: el `refreshToken` se toma desde la cookie `refreshToken` y el backend limpia esa cookie al responder.
 *       - `mobile`: el `refreshToken` puede enviarse en el body para revocar la sesión activa.
 *
 *       En ambos casos, el backend encuentra la sesión por su `refreshTokenHash` en Prisma y la marca como `isRevoked`. Si la sesión no existe, se limpia la cookie y la respuesta sigue siendo exitosa.
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: header
 *         name: x-client-type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [web, mobile]
 *         description: Tipo de cliente que solicita el cierre de sesión.
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
 *                 description: Refresh token opcional para clientes móviles. Para web, se toma desde la cookie.
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente. La respuesta incluye `ok: true`.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Solo para clientes web. Elimina la cookie `refreshToken` del navegador.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *               required:
 *                 - ok
 *       400:
 *         description: Error de validación del header o del body.
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
  "/logout",
  validate(logoutSchema),
  asyncHandler(authController.logout),
);

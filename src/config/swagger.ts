import swaggerJSDoc from "swagger-jsdoc";
import { env } from "./env.js";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AFAP API Documentation",
      version: "1.0.0",
      description: "Documentación interactiva de la API de AFAP",
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Servidor Local de Desarrollo",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Ingresa tu Access Token en formato: Bearer <token>",
        },
      },
      schemas: {
        UserResponse: {
          type: "object",
          properties: {
            id: { type: "string", example: "usr_clz123456" },
            username: { type: "string", example: "pepe_12" },
            email: { type: "string", example: "pepe@example.com" },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2026-07-13T12:00:00Z",
            },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            code: { type: "string", example: "INVALID_CREDENTIALS" },
            message: { type: "string", example: "Credenciales inválidas" },
          },
        },
        ValidationError: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            code: { type: "string", example: "VALIDATION_ERROR" },
            message: { type: "string", example: "Error de validación" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "body.email" },
                  message: {
                    type: "string",
                    example: "Formato de correo electrónico inválido",
                  },
                },
              },
            },
          },
        },
        TokenError: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            code: {
              type: "string",
              enum: [
                "MISSING_TOKEN",
                "INVALID_TOKEN",
                "TOKEN_EXPIRED_ERROR",
                "TOKEN_ERROR",
                "MISSING_TOKEN",
                "INVALID_SESSION",
                "EXPIRED_SESSION",
              ],
            },
            message: {
              type: "string",
              enum: [
                "Token requerido",
                "Token inválido",
                "El token ha expirado",
                "Token inválido o mal formado",
                "No se envio refreshToken",
                "sesión inválida o cerrada",
                "La sesión ha expirado",
              ],
            },
          },
          description:
            "Error de autenticación relacionado con JWT o con sesiones de refresh inválidas/expiradas.",
        },
        SessionSummary: {
          type: "object",
          properties: {
            id: { type: "string", example: "sess_123" },
            userId: { type: "string", example: "usr_456" },
            refreshTokenHash: {
              type: "string",
              example: "hash_del_refresh_token",
            },
            userAgent: { type: "string", example: "Mozilla/5.0" },
            ipAddress: { type: "string", example: "127.0.0.1" },
            isRevoked: { type: "boolean", example: false },
            expiresAt: {
              type: "string",
              format: "date-time",
              example: "2026-08-21T12:00:00.000Z",
            },
          },
          description:
            "Representa la sesión persistida en Prisma. El refresh real no se guarda, solo su hash.",
        },
      },
    },
  },
  apis: ["./src/routes/**/*.ts", "./src/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);

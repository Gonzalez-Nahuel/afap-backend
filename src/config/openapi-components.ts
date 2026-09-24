const apiErrorContent = (
  examples: Record<
    string,
    {
      summary: string;
      value: { ok: false; code: string; message: string };
    }
  >,
) => ({
  "application/json": {
    schema: { $ref: "#/components/schemas/ApiError" },
    examples,
  },
});

export const openApiComponents = {
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description:
        "Access token JWT. Swagger UI agrega automáticamente el prefijo Bearer.",
    },
  },
  parameters: {
    ClientTypeHeader: {
      name: "x-client-type",
      in: "header",
      required: true,
      description:
        "Define cómo se transporta el refresh token: cookie httpOnly para web o cuerpo JSON para mobile.",
      schema: {
        type: "string",
        enum: ["web", "mobile"],
      },
      example: "web",
    },
    RefreshTokenCookie: {
      name: "refreshToken",
      in: "cookie",
      required: false,
      description:
        "Refresh token utilizado por clientes web. Es obligatorio para renovar la sesión y opcional para cerrar sesión.",
      schema: { $ref: "#/components/schemas/RefreshToken" },
    },
  },
  schemas: {
    User: {
      type: "object",
      additionalProperties: false,
      required: ["id", "username", "email", "createdAt"],
      properties: {
        id: {
          type: "string",
          format: "uuid",
          example: "550e8400-e29b-41d4-a716-446655440000",
        },
        username: { type: "string", example: "nahuel_dev" },
        email: {
          type: "string",
          format: "email",
          example: "nahuel@example.com",
        },
        createdAt: {
          type: "string",
          format: "date-time",
          example: "2026-09-03T13:45:49.000Z",
        },
      },
    },
    AuthenticatedUser: {
      type: "object",
      additionalProperties: false,
      required: ["id", "username"],
      properties: {
        id: {
          type: "string",
          format: "uuid",
          example: "550e8400-e29b-41d4-a716-446655440000",
        },
        username: { type: "string", example: "nahuel_dev" },
      },
    },
    AccessToken: {
      type: "string",
      minLength: 1,
      description: "JWT de acceso con una vigencia de 15 minutos.",
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.signature",
    },
    RefreshToken: {
      type: "string",
      minLength: 1,
      description: "JWT de renovación con una vigencia de 7 días.",
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.signature",
    },
    Password: {
      type: "string",
      format: "password",
      writeOnly: true,
      minLength: 8,
      maxLength: 100,
      pattern: "^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,100}$",
      description:
        "Debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.",
      example: "SecureP@ss123",
    },
    RegisterRequest: {
      type: "object",
      additionalProperties: false,
      required: ["username", "email", "password"],
      properties: {
        username: {
          type: "string",
          minLength: 6,
          maxLength: 50,
          pattern: "^[a-zA-Z0-9_]+$",
          description: "Admite letras, números y guiones bajos.",
          example: "nahuel_dev",
        },
        email: {
          type: "string",
          format: "email",
          maxLength: 80,
          example: "nahuel@example.com",
        },
        password: { $ref: "#/components/schemas/Password" },
      },
    },
    RegisterResponse: {
      type: "object",
      additionalProperties: false,
      required: ["ok", "user", "message"],
      properties: {
        ok: { type: "boolean", enum: [true], example: true },
        user: { $ref: "#/components/schemas/User" },
        message: {
          type: "string",
          example:
            "Usuario registrado con éxito. Se ha enviado un código de verificación a tu correo electrónico",
        },
      },
    },
    EmailRequest: {
      type: "object",
      additionalProperties: false,
      required: ["email"],
      properties: {
        email: {
          type: "string",
          format: "email",
          maxLength: 80,
          example: "nahuel@example.com",
        },
      },
    },
    VerifyEmailRequest: {
      type: "object",
      additionalProperties: false,
      required: ["email", "token"],
      properties: {
        email: {
          type: "string",
          format: "email",
          maxLength: 80,
          example: "nahuel@example.com",
        },
        token: {
          type: "string",
          pattern: "^[0-9]{6}$",
          minLength: 6,
          maxLength: 6,
          description: "Código OTP de seis dígitos enviado por email.",
          example: "482731",
        },
      },
    },
    LoginRequest: {
      type: "object",
      additionalProperties: false,
      required: ["email", "password"],
      properties: {
        email: {
          type: "string",
          format: "email",
          maxLength: 80,
          example: "nahuel@example.com",
        },
        password: {
          type: "string",
          format: "password",
          writeOnly: true,
          minLength: 8,
          maxLength: 100,
          example: "SecureP@ss123",
        },
      },
    },
    ResetPasswordRequest: {
      type: "object",
      additionalProperties: false,
      required: ["email", "token", "password"],
      properties: {
        email: {
          type: "string",
          format: "email",
          maxLength: 80,
          example: "nahuel@example.com",
        },
        token: {
          type: "string",
          format: "uuid",
          writeOnly: true,
          description:
            "Token de un solo uso recibido en el enlace de recuperación.",
          example: "550e8400-e29b-41d4-a716-446655440000",
        },
        password: { $ref: "#/components/schemas/Password" },
      },
    },
    ChangePasswordRequest: {
      type: "object",
      additionalProperties: false,
      required: ["currentPassword", "newPassword"],
      properties: {
        currentPassword: {
          allOf: [{ $ref: "#/components/schemas/Password" }],
          description:
            "Contraseña actual del usuario, requerida para confirmar el cambio.",
        },
        newPassword: {
          allOf: [{ $ref: "#/components/schemas/Password" }],
          description: "Nueva contraseña que reemplazará a la actual.",
        },
      },
    },
    LoginWebResponse: {
      type: "object",
      additionalProperties: false,
      required: ["ok", "user", "accessToken"],
      properties: {
        ok: { type: "boolean", enum: [true], example: true },
        user: { $ref: "#/components/schemas/AuthenticatedUser" },
        accessToken: { $ref: "#/components/schemas/AccessToken" },
      },
      description:
        "Respuesta para web. El refresh token se entrega únicamente mediante una cookie httpOnly.",
    },
    LoginMobileResponse: {
      type: "object",
      additionalProperties: false,
      required: ["ok", "user", "accessToken", "refreshToken"],
      properties: {
        ok: { type: "boolean", enum: [true], example: true },
        user: { $ref: "#/components/schemas/AuthenticatedUser" },
        accessToken: { $ref: "#/components/schemas/AccessToken" },
        refreshToken: { $ref: "#/components/schemas/RefreshToken" },
      },
      description: "Respuesta para mobile. Ambos tokens se entregan en JSON.",
    },
    LoginResponse: {
      oneOf: [
        { $ref: "#/components/schemas/LoginWebResponse" },
        { $ref: "#/components/schemas/LoginMobileResponse" },
      ],
    },
    AuthenticatedUserResponse: {
      type: "object",
      additionalProperties: false,
      required: ["ok", "user"],
      properties: {
        ok: { type: "boolean", enum: [true], example: true },
        user: { $ref: "#/components/schemas/AuthenticatedUser" },
      },
    },
    RefreshTokenRequest: {
      type: "object",
      additionalProperties: false,
      properties: {
        refreshToken: { $ref: "#/components/schemas/RefreshToken" },
      },
      description:
        "Para clientes mobile, refreshToken es obligatorio. En web el body se omite y el token se lee desde la cookie httpOnly.",
    },
    RefreshWebResponse: {
      type: "object",
      additionalProperties: false,
      required: ["ok", "accessToken"],
      properties: {
        ok: { type: "boolean", enum: [true], example: true },
        accessToken: { $ref: "#/components/schemas/AccessToken" },
      },
      description:
        "Respuesta para web. El nuevo refresh token se entrega mediante una cookie httpOnly.",
    },
    RefreshMobileResponse: {
      type: "object",
      additionalProperties: false,
      required: ["ok", "accessToken", "refreshToken"],
      properties: {
        ok: { type: "boolean", enum: [true], example: true },
        accessToken: { $ref: "#/components/schemas/AccessToken" },
        refreshToken: { $ref: "#/components/schemas/RefreshToken" },
      },
      description: "Respuesta para mobile. Ambos tokens se entregan en JSON.",
    },
    RefreshResponse: {
      oneOf: [
        { $ref: "#/components/schemas/RefreshWebResponse" },
        { $ref: "#/components/schemas/RefreshMobileResponse" },
      ],
    },
    MessageResponse: {
      type: "object",
      additionalProperties: false,
      required: ["ok", "message"],
      properties: {
        ok: { type: "boolean", enum: [true], example: true },
        message: { type: "string" },
      },
    },
    LogoutResponse: {
      type: "object",
      additionalProperties: false,
      required: ["ok"],
      properties: {
        ok: { type: "boolean", enum: [true], example: true },
      },
    },
    ApiError: {
      type: "object",
      additionalProperties: false,
      required: ["ok", "code", "message"],
      properties: {
        ok: { type: "boolean", enum: [false], example: false },
        code: { type: "string", example: "INVALID_CREDENTIALS" },
        message: { type: "string", example: "Credenciales inválidas" },
        stack: {
          type: "string",
          readOnly: true,
          description:
            "Disponible únicamente en desarrollo para errores no controlados.",
        },
      },
    },
    ValidationIssue: {
      type: "object",
      additionalProperties: false,
      required: ["field", "message"],
      properties: {
        field: { type: "string", example: "body.email" },
        message: {
          type: "string",
          example: "Formato de correo electrónico inválido",
        },
      },
    },
    ValidationError: {
      type: "object",
      additionalProperties: false,
      required: ["ok", "code", "message", "errors"],
      properties: {
        ok: { type: "boolean", enum: [false], example: false },
        code: { type: "string", enum: ["VALIDATION_ERROR"] },
        message: { type: "string", example: "Error de validación" },
        errors: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/components/schemas/ValidationIssue" },
        },
      },
    },
    ResetPasswordError: {
      oneOf: [
        { $ref: "#/components/schemas/ValidationError" },
        { $ref: "#/components/schemas/ApiError" },
      ],
      description:
        "La solicitud no cumple el contrato o el enlace de recuperación es inválido o venció.",
    },
    ChangePasswordError: {
      oneOf: [
        { $ref: "#/components/schemas/ValidationError" },
        { $ref: "#/components/schemas/ApiError" },
      ],
      description:
        "La solicitud no cumple el contrato o la contraseña actual es incorrecta.",
    },
  },
  responses: {
    ValidationError: {
      description: "El header, body, parámetro o query no cumple el contrato.",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ValidationError" },
        },
      },
    },
    ResetPasswordBadRequest: {
      description:
        "Los datos no cumplen el contrato o el enlace de recuperación es inválido o venció.",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ResetPasswordError" },
          examples: {
            invalidOrExpiredToken: {
              summary: "Enlace inválido o vencido",
              value: {
                ok: false,
                code: "INVALID_OR_EXPIRED_TOKEN",
                message:
                  "El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.",
              },
            },
            invalidPassword: {
              summary: "Contraseña que no cumple los requisitos",
              value: {
                ok: false,
                code: "VALIDATION_ERROR",
                message: "Error de validación",
                errors: [
                  {
                    field: "body.password",
                    message: "La contraseña debe tener al menos 8 caracteres",
                  },
                ],
              },
            },
          },
        },
      },
    },
    ChangePasswordBadRequest: {
      description:
        "Los datos no cumplen el contrato o la contraseña actual es incorrecta.",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ChangePasswordError" },
          examples: {
            passwordMismatch: {
              summary: "Contraseña actual incorrecta",
              value: {
                ok: false,
                code: "PASSWORD_MISMATCH",
                message: "La contraseña actual es incorrecta",
              },
            },
            invalidNewPassword: {
              summary: "Nueva contraseña que no cumple los requisitos",
              value: {
                ok: false,
                code: "VALIDATION_ERROR",
                message: "Error de validación",
                errors: [
                  {
                    field: "body.newPassword",
                    message: "La contraseña debe tener al menos 8 caracteres",
                  },
                ],
              },
            },
          },
        },
      },
    },
    Unauthorized: {
      description:
        "El access token requerido está ausente, es inválido o está vencido.",
      content: apiErrorContent({
        missingToken: {
          summary: "Token ausente",
          value: {
            ok: false,
            code: "MISSING_TOKEN",
            message: "Token requerido",
          },
        },
        invalidToken: {
          summary: "Token inválido",
          value: {
            ok: false,
            code: "INVALID_TOKEN",
            message: "Token inválido",
          },
        },
        expiredToken: {
          summary: "JWT vencido",
          value: {
            ok: false,
            code: "TOKEN_EXPIRED_ERROR",
            message: "El token ha expirado",
          },
        },
        malformedToken: {
          summary: "JWT inválido o mal formado",
          value: {
            ok: false,
            code: "TOKEN_ERROR",
            message: "Token inválido o mal formado",
          },
        },
      }),
    },
    InvalidCredentials: {
      description: "El email o la contraseña son incorrectos.",
      content: apiErrorContent({
        invalidCredentials: {
          summary: "Credenciales inválidas",
          value: {
            ok: false,
            code: "INVALID_CREDENTIALS",
            message: "Credenciales inválidas",
          },
        },
      }),
    },
    InvalidVerificationToken: {
      description: "El código OTP no coincide con el código vigente.",
      content: apiErrorContent({
        invalidVerificationToken: {
          summary: "OTP incorrecto",
          value: {
            ok: false,
            code: "VERIFICATION_TOKEN_INVALID",
            message: "El código de verificación es inválido",
          },
        },
      }),
    },
    InvalidRefreshToken: {
      description:
        "El refresh token está ausente o vencido, o la sesión es inválida, revocada o expirada.",
      content: apiErrorContent({
        missingToken: {
          summary: "Refresh token ausente",
          value: {
            ok: false,
            code: "MISSING_TOKEN",
            message: "No se envió el refresh token",
          },
        },
        expiredToken: {
          summary: "JWT vencido",
          value: {
            ok: false,
            code: "TOKEN_EXPIRED_ERROR",
            message: "El token ha expirado",
          },
        },
        malformedToken: {
          summary: "JWT inválido o mal formado",
          value: {
            ok: false,
            code: "TOKEN_ERROR",
            message: "Token inválido o mal formado",
          },
        },
        invalidSession: {
          summary: "Sesión inválida o revocada",
          value: {
            ok: false,
            code: "INVALID_SESSION",
            message: "Sesión inválida o cerrada",
          },
        },
        expiredSession: {
          summary: "Sesión vencida",
          value: {
            ok: false,
            code: "EXPIRED_SESSION",
            message: "La sesión ha expirado",
          },
        },
      }),
    },
    Forbidden: {
      description: "La cuenta existe, pero todavía no fue verificada.",
      content: apiErrorContent({
        userNotVerified: {
          summary: "Cuenta no verificada",
          value: {
            ok: false,
            code: "USER_NOT_VERIFIED",
            message: "La cuenta aún no ha sido verificada. Verifíquela",
          },
        },
      }),
    },
    NotFound: {
      description: "El recurso solicitado no existe o ya venció.",
      content: apiErrorContent({
        verificationTokenNotFound: {
          summary: "OTP inexistente o vencido",
          value: {
            ok: false,
            code: "VERIFICATION_TOKEN_NOT_FOUND_OR_EXPIRED",
            message:
              "El código de verificación no existe o ha expirado. Solicita uno nuevo",
          },
        },
        recordNotFound: {
          summary: "Registro inexistente",
          value: {
            ok: false,
            code: "NOT_FOUND_ERROR",
            message: "El registro solicitado no existe o no fue encontrado",
          },
        },
      }),
    },
    RecordNotFound: {
      description: "El usuario asociado a la operación ya no existe.",
      content: apiErrorContent({
        recordNotFound: {
          summary: "Usuario inexistente",
          value: {
            ok: false,
            code: "NOT_FOUND_ERROR",
            message: "El registro solicitado no existe o no fue encontrado",
          },
        },
      }),
    },
    Conflict: {
      description: "El recurso entra en conflicto con información existente.",
      content: apiErrorContent({
        userExists: {
          summary: "Email ya registrado",
          value: {
            ok: false,
            code: "USER_EXISTS",
            message: "El email ya está registrado",
          },
        },
        duplicatedResource: {
          summary: "Llave duplicada",
          value: {
            ok: false,
            code: "CONFLICT_ERROR",
            message:
              "El recurso que intentas crear ya existe (llave duplicada)",
          },
        },
      }),
    },
    TooManyRequests: {
      description: "Se superó el límite de intentos o de solicitudes.",
      content: apiErrorContent({
        tooManyAttempts: {
          summary: "Demasiados intentos de verificación",
          value: {
            ok: false,
            code: "TOO_MANY_ATTEMPTS",
            message:
              "Has superado el límite de intentos permitidos. Solicita un nuevo código",
          },
        },
        verificationRetryLater: {
          summary: "Reenvío de OTP solicitado demasiado pronto",
          value: {
            ok: false,
            code: "TOO_MANY_REQUEST",
            message:
              "Por favor, espera 60 segundos antes de solicitar un nuevo código.",
          },
        },
        passwordResetRetryLater: {
          summary: "Recuperación solicitada demasiado pronto",
          value: {
            ok: false,
            code: "TOO_MANY_REQUEST",
            message:
              "Ya solicitaste un cambio de contraseña. Revisa tu correo o espera 60 segundos para solicitar uno nuevo.",
          },
        },
      }),
    },
    EmailDeliveryError: {
      description: "El proveedor de email no pudo entregar el mensaje.",
      content: apiErrorContent({
        emailSendError: {
          summary: "Fallo del proveedor de email",
          value: {
            ok: false,
            code: "EMAIL_SEND_ERROR",
            message: "No se pudo enviar el email, intenta de nuevo más tarde",
          },
        },
      }),
    },
    ServiceUnavailable: {
      description: "La base de datos no está disponible temporalmente.",
      content: apiErrorContent({
        databaseUnavailable: {
          summary: "Conexión a la base de datos fallida",
          value: {
            ok: false,
            code: "DATABASE_CONNECTION_ERROR",
            message: "Servicio de base de datos temporalmente no disponible",
          },
        },
      }),
    },
    InternalServerError: {
      description: "Error interno no controlado.",
      content: apiErrorContent({
        unknownError: {
          summary: "Error inesperado",
          value: {
            ok: false,
            code: "UNKNOWN_ERROR",
            message: "Internal server error",
          },
        },
        databaseError: {
          summary: "Error al procesar datos",
          value: {
            ok: false,
            code: "DATABASE_ERROR",
            message: "Hubo un error al procesar los datos en el servidor",
          },
        },
      }),
    },
  },
} as const;

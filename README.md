# AFAP Backend

API REST para la plataforma AFAP, orientada a la organización de competencias deportivas. El módulo implementado actualmente cubre registro, verificación de email, autenticación y rotación de sesiones para clientes web y mobile.

## Tecnologías

- Node.js, Express y TypeScript con módulos ESM.
- PostgreSQL y Prisma ORM.
- Redis para OTP, recuperación de contraseña y límites temporales.
- JWT para access tokens y refresh tokens.
- Swagger UI y OpenAPI 3.0 para documentación interactiva.

## Requisitos

- Node.js 22 o superior.
- PostgreSQL.
- Redis.
- Una API key de Resend para los emails transaccionales.

## Configuración local

Copiá `.env.example` como `.env` y reemplazá los valores de ejemplo:

```bash
cp .env.example .env
```

Instalá las dependencias, generá el cliente de Prisma y arrancá el servidor:

```bash
npm ci
npm run prisma:generate
npm run dev
```

## Documentación de la API

Con el servidor en ejecución:

- Swagger UI: `http://localhost:3000/docs`
- Documento OpenAPI JSON: `http://localhost:3000/openapi.json`

El header `x-client-type` define el contrato de sesión:

- `web`: el refresh token se guarda en una cookie httpOnly; las respuestas JSON sólo incluyen el access token.
- `mobile`: el refresh token se recibe y devuelve en el cuerpo JSON.

Swagger UI agrega automáticamente `Bearer` al access token ingresado mediante el botón **Authorize**.

## Scripts

| Comando                         | Propósito                                                                |
| ------------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`                   | Ejecutar la API en modo desarrollo con recarga automática.               |
| `npm run build`                 | Compilar TypeScript y resolver los aliases para Node ESM.                |
| `npm start`                     | Ejecutar el JavaScript compilado.                                        |
| `npm run prisma:generate`       | Generar el cliente de Prisma.                                            |
| `npm run openapi:generate`      | Generar `openapi.json` desde los comentarios `@openapi`.                 |
| `npm run openapi:validate`      | Validar estructura, referencias y reglas de calidad del contrato fuente. |
| `npm run openapi:validate:dist` | Validar el contrato generado desde el build de producción.               |

`openapi.json` es un artefacto generado y por eso no se versiona.

## Validación continua

El workflow de GitHub Actions se ejecuta en cada pull request y en cada push a `main`. Instala dependencias, genera Prisma, valida el contrato OpenAPI fuente, compila el proyecto y vuelve a validar OpenAPI desde `dist`.

La validación falla si el documento no cumple OpenAPI 3.0, contiene referencias `$ref` inválidas, repite un `operationId` o deja una operación sin resumen, descripción, tags o respuestas esperadas.

# AFAP Backend

API REST para la plataforma AFAP, orientada a la organización de competencias deportivas. El proyecto cuenta actualmente con un módulo de autenticación completo, preparado para clientes web y mobile, y un entorno contenerizado para facilitar su ejecución y desarrollo.

## Tecnologías

- Node.js 22 y Express 5.
- TypeScript con módulos ESM.
- PostgreSQL y Prisma ORM.
- Redis para OTP, recuperación de contraseña, controles temporales y mecanismos de protección.
- JWT para access tokens y refresh tokens.
- Vitest y Supertest para testing.
- Docker y Docker Compose para contenerización y orquestación local.
- Swagger y OpenAPI 3.0 para documentación de la API.
- GitHub Actions para integración continua (CI).
- Resend para emails transaccionales.

## Funcionalidades

### Autenticación y gestión de sesiones

- Registro de usuarios y verificación de email mediante OTP.
- Reenvío de códigos de verificación.
- Login para clientes web y mobile.
- Access tokens y refresh tokens.
- Rotación de tokens y gestión de sesiones.
- Logout y revocación de sesiones.
- Recuperación y restablecimiento de contraseña.
- Cambio de contraseña desde una sesión autenticada.
- Endpoint para obtener la información del usuario autenticado.
- Validaciones de entrada y middleware de autenticación.

### Seguridad

- Hashing de contraseñas.
- Refresh tokens almacenados mediante hashes.
- Access tokens de corta duración.
- Refresh token rotation.
- Revocación de sesiones.
- Cookies httpOnly para sesiones web.
- Validaciones y controles temporales mediante Redis.
- Respuestas uniformes en el flujo de recuperación de contraseña para evitar revelar si una cuenta existe.
- Validación de datos de entrada mediante esquemas.
- Separación del comportamiento de autenticación según el tipo de cliente.

## Arquitectura

El backend está organizado en módulos y responsabilidades separadas, buscando mantener una estructura mantenible y facilitar la incorporación de nuevas funcionalidades.

La aplicación utiliza PostgreSQL como almacenamiento persistente para los datos de usuarios y sesiones, mientras que Redis se utiliza para mecanismos temporales relacionados con autenticación, verificaciones y controles de intentos.

La lógica de autenticación contempla diferentes contratos de sesión según el cliente:

- **Web:** el refresh token se gestiona mediante una cookie httpOnly.
- **Mobile:** el refresh token se entrega y recibe mediante el cuerpo JSON de las solicitudes.

## Testing

La aplicación cuenta con tests unitarios, de integración y E2E, utilizando Vitest y Supertest.

Las pruebas de integración y E2E utilizan PostgreSQL y Redis reales, permitiendo validar el comportamiento de la aplicación y los distintos flujos de autenticación sin depender de versiones simuladas de estos servicios.

Resend se mockea durante las pruebas para evitar el envío de emails reales.

La suite de tests cubre distintos escenarios, incluyendo:

- Middleware de autenticación y validaciones.
- Registro y verificación de usuarios.
- Login para clientes web y mobile.
- Reenvío de OTP.
- Recuperación y cambio de contraseña.
- Refresh token rotation.
- Logout y revocación de sesiones.
- Validaciones de respuestas, errores y comportamiento de los flujos de autenticación.

## Documentación de la API

La API está documentada utilizando Swagger y OpenAPI 3.0.

Con el servidor en ejecución:

- Swagger UI: `http://localhost:3000/docs`
- Documento OpenAPI JSON: `http://localhost:3000/openapi.json`

Swagger UI permite explorar los endpoints, consultar esquemas, visualizar respuestas y ejecutar solicitudes directamente contra la API.

El header `x-client-type` define el contrato de sesión:

- `web`: el refresh token se guarda en una cookie httpOnly; las respuestas JSON sólo incluyen el access token.
- `mobile`: el refresh token se recibe y devuelve en el cuerpo JSON.

Swagger UI agrega automáticamente `Bearer` al access token ingresado mediante el botón **Authorize**.

### Rutas de autenticación

| Método | Ruta                        | Autenticación | Propósito                                      |
| ------ | --------------------------- | ------------- | ---------------------------------------------- |
| POST   | `/api/auth/register`        | Pública       | Registrar una cuenta y enviar el OTP.          |
| POST   | `/api/auth/verify-email`    | Pública       | Verificar la cuenta mediante el OTP.           |
| POST   | `/api/auth/resend-otp`      | Pública       | Solicitar un nuevo OTP de verificación.        |
| POST   | `/api/auth/login`           | Pública       | Iniciar una sesión web o mobile.               |
| POST   | `/api/auth/forgot-password` | Pública       | Solicitar un enlace para recuperar la cuenta.  |
| POST   | `/api/auth/reset-password`  | Pública       | Restablecer la contraseña mediante el enlace.  |
| POST   | `/api/auth/change-password` | Bearer JWT    | Cambiar la contraseña desde una sesión activa. |
| GET    | `/api/auth/me`              | Bearer JWT    | Obtener la identidad del usuario autenticado.  |
| POST   | `/api/auth/refresh`         | Refresh token | Rotar los tokens de la sesión.                 |
| POST   | `/api/auth/logout`          | Refresh token | Revocar la sesión actual.                      |

### Consideraciones sobre autenticación

- `forgot-password` responde de manera uniforme aunque el email no exista o la cuenta no esté verificada.
- El enlace enviado por email para recuperar la contraseña vence a los 15 minutos y se invalida después de restablecer la contraseña.
- Tanto `reset-password` como `change-password` revocan las sesiones de renovación del usuario.
- Los access tokens ya emitidos conservan su validez hasta su vencimiento de 15 minutos.
- Para `change-password` se deben enviar `currentPassword` y `newPassword`. Ambas deben cumplir la política de contraseña definida por la API.

## Docker

El proyecto cuenta con un entorno contenerizado mediante Docker y Docker Compose, que permite ejecutar el backend y sus servicios asociados de forma aislada y reproducible.

### Servicios

Docker Compose administra los siguientes servicios:

- **Backend:** aplicación Node.js compilada y ejecutada en un contenedor.
- **PostgreSQL:** base de datos relacional para persistencia.
- **Redis:** almacenamiento de datos temporales utilizados por los mecanismos de autenticación.
- **Migrate:** servicio encargado de aplicar las migraciones pendientes de Prisma antes de iniciar el backend.

### Dockerfile

El Dockerfile utiliza multi-stage builds para separar el entorno de compilación del entorno de ejecución, evitando incluir dependencias y herramientas innecesarias en la imagen final.

### Docker Compose

Docker Compose permite configurar y ejecutar los servicios del proyecto, gestionar sus dependencias, conectividad y configuración mediante variables de entorno.

El entorno incluye mecanismos de healthcheck y dependencias entre servicios para coordinar su inicialización.

### Ejecución con Docker

Con Docker y Docker Compose instalados y el archivo `.env` configurado:

```bash
docker compose up --build
```

Para ejecutar los servicios en segundo plano:

```bash
docker compose up --build -d
```

Para consultar el estado de los contenedores:

```bash
docker compose ps
```

Para consultar los logs:

```bash
docker compose logs -f
```

Para detener el entorno:

```bash
docker compose down
```

## Configuración local

### Requisitos

- Node.js 22 o superior.
- PostgreSQL.
- Redis.
- Docker y Docker Compose (para la ejecución contenerizada).
- Una API key de Resend para los emails transaccionales.
- Una URL de frontend para construir los enlaces de recuperación de contraseña.

### Variables de entorno

Copiá `.env.example` como `.env` y reemplazá los valores de ejemplo:

```bash
cp .env.example .env
```

Las variables de entorno permiten configurar las conexiones a PostgreSQL y Redis, credenciales, tokens, servicios externos y demás parámetros requeridos por la aplicación.

### Instalación y ejecución

Instalá las dependencias, generá el cliente de Prisma y arrancá el servidor:

```bash
npm ci
npm run prisma:generate
npm run dev
```

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

## Integración continua (CI)

El proyecto utiliza GitHub Actions para automatizar las validaciones del backend en cada pull request y push a `main`.

El workflow incluye:

1. Instalación de dependencias.
2. Generación del cliente de Prisma.
3. Ejecución de migraciones pendientes.
4. Validación del contrato OpenAPI del código fuente.
5. Compilación del proyecto.
6. Validación del contrato OpenAPI generado desde el build.
7. Ejecución de la suite completa de tests.

Durante la ejecución del workflow se utilizan servicios de PostgreSQL y Redis para validar el comportamiento de la aplicación y ejecutar los tests.

### Validación de OpenAPI

El proceso de validación verifica que el contrato cumpla con OpenAPI 3.0, incluyendo:

- Estructura válida del documento.
- Referencias `$ref` válidas.
- `operationId` únicos.
- Operaciones documentadas con resumen, descripción, tags y respuestas esperadas.

## Próximos pasos

- Despliegue de la aplicación en AWS.
- Configuración de infraestructura, networking y seguridad.
- Implementación del proceso de deployment.
- Documentación de infraestructura y despliegue.
- Desarrollo de los siguientes módulos de la plataforma AFAP.

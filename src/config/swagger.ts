import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import swaggerJSDoc from "swagger-jsdoc";
import { openApiComponents } from "./openapi-components.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);
const sourceExtension = extname(currentFile) === ".ts" ? "ts" : "js";
const normalizeGlob = (value: string) => value.replaceAll("\\", "/");

const options: swaggerJSDoc.Options = {
  failOnErrors: true,
  definition: {
    openapi: "3.0.3",
    info: {
      title: "AFAP API",
      version: "1.0.0",
      description:
        "API para autenticación y administración de competencias deportivas en AFAP.",
    },
    servers: [
      {
        url: "/",
        description: "Servidor que expone esta documentación",
      },
    ],
    tags: [
      {
        name: "Auth",
        description:
          "Registro, verificación de email, inicio de sesión y administración de tokens.",
      },
    ],
    components: openApiComponents,
  },
  apis: [
    normalizeGlob(
      resolve(currentDirectory, `../routes/**/*.${sourceExtension}`),
    ),
    normalizeGlob(
      resolve(currentDirectory, `../modules/**/*.routes.${sourceExtension}`),
    ),
  ],
};

export const swaggerSpec = swaggerJSDoc(options);

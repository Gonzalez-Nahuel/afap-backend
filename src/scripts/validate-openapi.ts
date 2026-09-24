import SwaggerParser from "@apidevtools/swagger-parser";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(process.cwd(), "openapi.json");
const document = JSON.parse(await readFile(inputPath, "utf8"));

await SwaggerParser.validate(document);

const httpMethods = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);
const operationIds = new Set<string>();
const qualityErrors: string[] = [];

for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
  if (!pathItem || typeof pathItem !== "object") continue;

  for (const [method, operation] of Object.entries(pathItem)) {
    if (!httpMethods.has(method) || !operation || typeof operation !== "object")
      continue;

    const operationRecord = operation as Record<string, unknown>;
    const operationName = `${method.toUpperCase()} ${path}`;
    const operationId = operationRecord.operationId;

    if (typeof operationId !== "string" || operationId.length === 0) {
      qualityErrors.push(`${operationName} no tiene operationId.`);
    } else if (operationIds.has(operationId)) {
      qualityErrors.push(`operationId duplicado: ${operationId}.`);
    } else {
      operationIds.add(operationId);
    }

    if (
      typeof operationRecord.summary !== "string" ||
      operationRecord.summary.length === 0
    ) {
      qualityErrors.push(`${operationName} no tiene summary.`);
    }

    if (
      typeof operationRecord.description !== "string" ||
      operationRecord.description.length === 0
    ) {
      qualityErrors.push(`${operationName} no tiene description.`);
    }

    if (
      !Array.isArray(operationRecord.tags) ||
      operationRecord.tags.length === 0
    ) {
      qualityErrors.push(`${operationName} no tiene tags.`);
    }

    const responses = operationRecord.responses;
    if (!responses || typeof responses !== "object") {
      qualityErrors.push(`${operationName} no tiene responses.`);
      continue;
    }

    const responseCodes = Object.keys(responses);
    if (!responseCodes.some((code) => /^2\d\d$/.test(code))) {
      qualityErrors.push(
        `${operationName} no documenta una respuesta exitosa.`,
      );
    }
    if (!responseCodes.some((code) => /^4\d\d$/.test(code))) {
      qualityErrors.push(`${operationName} no documenta errores del cliente.`);
    }
    if (!responseCodes.some((code) => /^5\d\d$/.test(code))) {
      qualityErrors.push(`${operationName} no documenta errores del servidor.`);
    }
  }
}

if (qualityErrors.length > 0) {
  throw new Error(
    `OpenAPI quality checks failed:\n- ${qualityErrors.join("\n- ")}`,
  );
}

console.log(
  `OpenAPI document is valid: ${operationIds.size} operations checked.`,
);

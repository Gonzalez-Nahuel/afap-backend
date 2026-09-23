import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { swaggerSpec } from "../config/swagger.js";
import { logger } from "@/lib/logger.js";

const outputPath = resolve(process.cwd(), "openapi.json");

await writeFile(
  outputPath,
  `${JSON.stringify(swaggerSpec, null, 2)}\n`,
  "utf8",
);

logger.info(`OpenAPI document generated at ${outputPath}`);

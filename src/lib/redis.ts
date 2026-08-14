import Redis from "ioredis";
import { logger } from "./logger";
import { env } from "@/config/env";

const REDIS_URL = env.REDIS_URL || "redis://127.0.0.1:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  logger.info("Conexión exitosa con el servidor de Redis");
});

redis.on("error", (err) => {
  logger.error({ err }, "Error en la conexión con Redis");
});

import { env } from "@/config/env.js";
import pino from "pino";

export const logger = pino({
  level:
    env.NODE_ENV === "production"
      ? "info"
      : env.NODE_ENV === "test"
        ? "silent"
        : "debug",
  ...(env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});

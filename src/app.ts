import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { router } from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { logger } from "./lib/logger";

export const app = express();

app.set("trust proxy", true);

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

app.use(cookieParser());

app.use(pinoHttp({ logger }));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", router);

app.use(errorMiddleware);

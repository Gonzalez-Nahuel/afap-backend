import { env } from "@/config/env.js";
import { app } from "@/app.js";
import { logger } from "./lib/logger.js";

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});

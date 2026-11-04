import { createPinoLogger } from "../infrastructure/pino-logger.js"
import { startApp } from "./app.js"
import { loadConfig } from "./config.js"

const config = loadConfig(process.env)
const logger = createPinoLogger(config.logLevel)
const app = await startApp(config, logger)

logger.info({ port: app.port, metricsPort: app.metricsPort }, "server ready")

const shutdown = (signal: string) => {
  logger.info({ signal }, "shutting down")
  void app.stop().then(() => process.exit(0))
}

process.once("SIGTERM", () => shutdown("SIGTERM"))
process.once("SIGINT", () => shutdown("SIGINT"))

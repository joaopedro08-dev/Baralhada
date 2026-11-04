import { pino } from "pino"
import type { Logger } from "../application/ports.js"

export const createPinoLogger = (level: string): Logger => {
  const logger = pino({ level, base: null })
  return {
    info: (context, message) => logger.info(context, message),
    error: (context, message) => logger.error(context, message),
  }
}

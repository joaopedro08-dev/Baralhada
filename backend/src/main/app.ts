import type { Logger } from "../application/ports.js"
import { createAppHttpServer, createMetricsServer } from "../infrastructure/http-server.js"
import { loadNextFrontend } from "../infrastructure/next-frontend.js"
import { createSocketServer } from "../infrastructure/socket-server.js"
import type { AppConfig } from "./config.js"
import { buildContainer } from "./container.js"

export interface RunningApp {
  readonly port: number
  readonly metricsPort: number
  stop(): Promise<void>
}

const listen = (
  server: { listen(port: number, host: string, done: () => void): unknown; address(): unknown },
  port: number,
  host: string
): Promise<number> =>
  new Promise((resolve) => {
    server.listen(port, host, () => resolve((server.address() as { port: number }).port))
  })

export const startApp = async (config: AppConfig, logger: Logger): Promise<RunningApp> => {
  const { controller, metrics, scheduler, sweepRooms } = buildContainer(config, logger)
  const http = createAppHttpServer(logger)
  const metricsServer = createMetricsServer(metrics.registry)
  const servesDevFrontend = config.frontendDir !== null && !config.production

  if (config.production && config.frontendDir === null && config.corsOrigins.length === 0) {
    logger.error({}, "CORS_ORIGIN is empty: browsers on another address will be refused")
  }

  const io = createSocketServer(
    http.server,
    {
      corsOrigins: config.corsOrigins,
      keepForeignUpgrades: servesDevFrontend,
      trustProxy: config.trustProxy,
      clientIpHeader: config.clientIpHeader,
      maxConnectionsPerAddress: config.maxConnectionsPerAddress,
    },
    (connection) => controller.attach(connection)
  )

  const port = await listen(http.server, config.port, config.host)
  if (config.frontendDir) {
    http.setFrontend(
      await loadNextFrontend({
        dir: config.frontendDir,
        dev: !config.production,
        hostname: config.host,
        port,
        httpServer: http.server,
      })
    )
  }
  const metricsPort = await listen(metricsServer, config.metricsPort, config.host)
  http.setReady(true)

  const sweeper = setInterval(() => {
    try {
      sweepRooms.execute()
    } catch (failure) {
      logger.error({ err: failure }, "room sweep failed")
    }
  }, config.sweepIntervalMs)
  sweeper.unref()

  return {
    port,
    metricsPort,
    stop: async () => {
      http.setReady(false)
      clearInterval(sweeper)
      scheduler.cancelAll()
      metricsServer.close()
      await io.close()
    },
  }
}

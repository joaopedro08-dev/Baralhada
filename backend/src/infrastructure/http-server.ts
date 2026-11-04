import { createServer } from "node:http"
import type { RequestListener, Server, ServerResponse } from "node:http"
import type { Registry } from "prom-client"
import type { Logger } from "../application/ports.js"
import type { FrontendHandler } from "./next-frontend.js"

const writeJson = (res: ServerResponse, status: number, body: object): void => {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" })
  res.end(JSON.stringify(body))
}

export interface AppHttpServer {
  readonly server: Server
  setFrontend(handler: FrontendHandler): void
  setReady(ready: boolean): void
}

export const createAppHttpServer = (logger: Logger): AppHttpServer => {
  let frontend: FrontendHandler | null = null
  let ready = false

  const listener: RequestListener = (req, res) => {
    const path = req.url?.split("?")[0]
    if (path === "/healthz") return writeJson(res, 200, { status: "ok" })
    if (path === "/readyz") {
      return writeJson(res, ready ? 200 : 503, { status: ready ? "ready" : "starting" })
    }
    if (frontend) {
      return void frontend(req, res).catch((failure: unknown) => {
        logger.error({ err: failure }, "frontend request failed")
        if (res.headersSent) res.destroy()
        else writeJson(res, 500, { error: "internal_error" })
      })
    }
    return writeJson(res, 404, { error: "not_found" })
  }

  return {
    server: createServer(listener),
    setFrontend: (handler) => {
      frontend = handler
    },
    setReady: (value) => {
      ready = value
    },
  }
}

export const createMetricsServer = (registry: Registry): Server =>
  createServer((req, res) => {
    if (req.url !== "/metrics") return writeJson(res, 404, { error: "not_found" })
    return void registry.metrics().then((body) => {
      res.writeHead(200, { "content-type": registry.contentType })
      res.end(body)
    })
  })

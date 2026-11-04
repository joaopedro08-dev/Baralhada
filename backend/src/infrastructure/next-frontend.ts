import { createRequire } from "node:module"
import type { IncomingMessage, Server, ServerResponse } from "node:http"
import { join, resolve } from "node:path"

export type FrontendHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>

interface NextApp {
  prepare(): Promise<void>
  getRequestHandler(): FrontendHandler
}

type NextFactory = (options: {
  dev: boolean
  dir: string
  hostname: string
  port: number
  httpServer: Server
}) => NextApp

export const loadNextFrontend = async (options: {
  dir: string
  dev: boolean
  hostname: string
  port: number
  httpServer: Server
}): Promise<FrontendHandler> => {
  const dir = resolve(options.dir)
  const requireFromFrontend = createRequire(join(dir, "package.json"))
  const next = requireFromFrontend("next") as NextFactory | { default: NextFactory }
  const createNext = typeof next === "function" ? next : next.default
  const app = createNext({ ...options, dir })
  await app.prepare()
  return app.getRequestHandler()
}

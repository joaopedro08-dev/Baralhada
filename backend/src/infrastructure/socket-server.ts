import type { IncomingMessage, Server as HttpServer } from "node:http"
import { Server } from "socket.io"
import type { Socket } from "socket.io"
import type { ClientConnection, RawAck } from "../adapters/socket/connection.js"

const MAX_MESSAGE_BYTES = 4096
const PING_INTERVAL_MS = 15_000
const PING_TIMEOUT_MS = 10_000

const noopAck: RawAck = () => undefined

export interface SocketServerOptions {
  readonly corsOrigins: readonly string[]
  readonly keepForeignUpgrades: boolean
  readonly trustProxy: boolean
  readonly clientIpHeader: string
  readonly maxConnectionsPerAddress: number
}

const firstHeaderValue = (value: string | string[] | undefined): string | undefined =>
  (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim()

const proxiedAddressOf = (req: IncomingMessage, clientIpHeader: string): string | undefined =>
  firstHeaderValue(req.headers[clientIpHeader]) ?? firstHeaderValue(req.headers["x-forwarded-for"])

const addressOf = (req: IncomingMessage, options: SocketServerOptions): string =>
  (options.trustProxy ? proxiedAddressOf(req, options.clientIpHeader) : undefined) ??
  req.socket.remoteAddress ??
  "desconhecido"

const hostOf = (origin: string): string | null => {
  try {
    return new URL(origin).host
  } catch {
    return null
  }
}

const isAllowedOrigin = (req: IncomingMessage, options: SocketServerOptions): boolean => {
  const { origin } = req.headers
  if (!origin || options.corsOrigins.includes(origin)) return true
  const forwardedHost = options.trustProxy
    ? firstHeaderValue(req.headers["x-forwarded-host"])
    : undefined
  const expectedHost = forwardedHost ?? req.headers.host
  return expectedHost !== undefined && hostOf(origin) === expectedHost
}

const trackConnections = (limit: number) => {
  const open = new Map<string, number>()
  return {
    hasRoom: (address: string): boolean => (open.get(address) ?? 0) < limit,
    opened: (address: string): void => {
      open.set(address, (open.get(address) ?? 0) + 1)
    },
    closed: (address: string): void => {
      const remaining = (open.get(address) ?? 1) - 1
      if (remaining > 0) open.set(address, remaining)
      else open.delete(address)
    },
  }
}

const toConnection = (socket: Socket, clientAddress: string): ClientConnection => ({
  clientAddress,
  on: (event, listener) => {
    socket.on(event, (...args: unknown[]) => {
      const last = args.at(-1)
      const ack = typeof last === "function" ? (last as RawAck) : noopAck
      const payload = args.length > 0 && typeof args[0] !== "function" ? args[0] : undefined
      listener(payload, ack)
    })
  },
  onDisconnect: (listener) => {
    socket.on("disconnect", listener)
  },
  emit: (event, payload) => {
    socket.emit(event, payload)
  },
  close: () => {
    socket.disconnect(true)
  },
})

export const createSocketServer = (
  httpServer: HttpServer,
  options: SocketServerOptions,
  onConnection: (connection: ClientConnection) => void
): Server => {
  const connections = trackConnections(options.maxConnectionsPerAddress)
  const io = new Server(httpServer, {
    allowRequest: (req, decide) => {
      const allowed = isAllowedOrigin(req, options) && connections.hasRoom(addressOf(req, options))
      decide(null, allowed)
    },
    serveClient: false,
    perMessageDeflate: false,
    httpCompression: false,
    maxHttpBufferSize: MAX_MESSAGE_BYTES,
    pingInterval: PING_INTERVAL_MS,
    pingTimeout: PING_TIMEOUT_MS,
    destroyUpgrade: !options.keepForeignUpgrades,
    ...(options.corsOrigins.length > 0 ? { cors: { origin: [...options.corsOrigins] } } : {}),
  })
  io.on("connection", (socket) => {
    const clientAddress = addressOf(socket.request, options)
    connections.opened(clientAddress)
    socket.on("disconnect", () => connections.closed(clientAddress))
    onConnection(toConnection(socket, clientAddress))
  })
  return io
}

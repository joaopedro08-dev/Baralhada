import { io, type Socket } from "socket.io-client"
import {
  clientCommandPayloadSchemas,
  roomRemovedSchema,
} from "@naipe-real/contracts"

import type {
  Ack,
  GameGateway,
  GatewayListeners,
} from "@/lib/game/application/ports"
import type { RoomState } from "@/lib/game/domain/types"

const ACK_TIMEOUT_MS = 8000
const SERVER_CLOSED_REASON = "io server disconnect"
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL
const SOCKET_OPTIONS = {
  autoConnect: false,
  transports: ["websocket", "polling"],
  tryAllTransports: true,
  reconnectionDelayMax: 2000,
}

interface ServerEvents {
  "room:state": (state: RoomState) => void
  "room:removed": (payload: unknown) => void
}

interface AckEmitter {
  emitWithAck(command: string, ...args: readonly unknown[]): Promise<unknown>
}

const failure = (code: string, message: string) =>
  ({ ok: false, error: { code, message } }) as const

const openSocket = (listeners: GatewayListeners): Socket<ServerEvents> => {
  const socket: Socket<ServerEvents> = SERVER_URL
    ? io(SERVER_URL, SOCKET_OPTIONS)
    : io(SOCKET_OPTIONS)
  socket.on("connect", listeners.onConnected)
  socket.on("connect_error", listeners.onConnectionFailed)
  socket.on("disconnect", (reason) =>
    listeners.onDisconnected(
      reason === SERVER_CLOSED_REASON ? "replaced" : "lost"
    )
  )
  socket.on("room:state", listeners.onRoomState)
  socket.on("room:removed", (payload) => {
    if (roomRemovedSchema.safeParse(payload).success) listeners.onRemoved()
  })
  socket.connect()
  return socket
}

export const createSocketGateway = (): GameGateway => {
  let socket: Socket<ServerEvents> | null = null

  return {
    connect(listeners) {
      socket ??= openSocket(listeners)
    },

    resume() {
      socket?.connect()
    },

    restart() {
      socket?.disconnect()
      socket?.connect()
    },

    isConnected: () => socket?.connected ?? false,

    async send(command, ...args) {
      if (!socket?.connected) {
        return failure(
          "OFFLINE",
          "Sem conexão com o servidor. Tentando voltar..."
        )
      }
      const payload = args[0]
      const schema = clientCommandPayloadSchemas[command]
      if (!schema.safeParse(payload).success) {
        return failure("INVALID_PAYLOAD", "Dados inválidos.")
      }
      try {
        const emitter = socket.timeout(ACK_TIMEOUT_MS) as unknown as AckEmitter
        const answer = await emitter.emitWithAck(command, ...args)
        return answer as Ack<never>
      } catch {
        return failure(
          "TIMEOUT",
          "O servidor demorou para responder. Tente de novo."
        )
      }
    },
  }
}

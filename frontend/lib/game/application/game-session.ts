import type {
  Ack,
  AddressBar,
  GameGateway,
  GrantedSeat,
  SeatStore,
} from "@/lib/game/application/ports"
import { withLocalDeadline } from "@/lib/game/domain/turn-clock"
import type {
  Hints,
  PlayerId,
  RoomState,
  Seat,
  TurnAction,
} from "@/lib/game/domain/types"

export const RESTORE_RETRY_MS = 2000

const REMOVED_NOTICE = "O anfitrião removeu você da sala."
const ROOM_CLOSED_NOTICE =
  "Essa sala foi encerrada. Crie uma nova para jogar de novo."

export type ConnectionStatus = "connecting" | "online" | "offline" | "replaced"

export type Refusal = string | null

export interface GameSessionState {
  readonly connection: ConnectionStatus
  readonly room: RoomState | null
  readonly seat: Seat | null
  readonly restoring: boolean
  readonly inviteCode: string | null
  readonly notice: string | null
}

export const initialGameSessionState: GameSessionState = {
  connection: "connecting",
  room: null,
  seat: null,
  restoring: false,
  inviteCode: null,
  notice: null,
}

const refusalOf = (result: Ack<unknown>): Refusal =>
  result.ok ? null : result.error.message

export const createGameSession = ({
  gateway,
  seats,
  address,
  now,
}: {
  gateway: GameGateway
  seats: SeatStore
  address: AddressBar
  now: () => number
}) => {
  let state = initialGameSessionState
  let started = false
  const listeners = new Set<() => void>()

  const update = (changes: Partial<GameSessionState>): void => {
    state = { ...state, ...changes }
    listeners.forEach((listener) => listener())
  }

  const takeSeat = (granted: GrantedSeat, nickname: string): void => {
    const { code, playerId, reconnectToken } = granted
    const seat: Seat = {
      code,
      playerId,
      reconnectToken,
      nickname,
      inviteUrl: address.inviteLink(code),
    }
    seats.save(seat)
    address.showRoom(seat.code)
    update({ seat, restoring: false, inviteCode: null, notice: null })
  }

  const dropSeat = (
    notice: string | null,
    inviteCode: string | null = null
  ): void => {
    seats.forget()
    address.showRoom(inviteCode)
    update({ seat: null, room: null, restoring: false, inviteCode, notice })
  }

  const restoreSeat = async (seat: Seat): Promise<void> => {
    update({ restoring: true })
    const { code, nickname, reconnectToken } = seat
    const result = await gateway.send("room:reconnect", {
      code,
      nickname,
      reconnectToken,
    })
    if (state.seat !== seat) return
    if (result.ok) return takeSeat(result.data, nickname)
    if (result.error.code === "ALREADY_IN_ROOM") {
      return update({ restoring: false })
    }
    if (result.error.code === "ROOM_NOT_FOUND") {
      return dropSeat(ROOM_CLOSED_NOTICE)
    }
    if (result.error.code === "INVALID_RECONNECT") {
      return dropSeat(result.error.message, code)
    }
    setTimeout(() => {
      if (gateway.isConnected() && state.seat === seat) void restoreSeat(seat)
    }, RESTORE_RETRY_MS)
  }

  const applyRoomState = (next: RoomState): void => {
    const current = state.room
    if (current?.code === next.code && next.version < current.version) return
    update({ room: withLocalDeadline(next, now()) })
  }

  const enterRoom = async (
    nickname: string,
    send: () => Promise<Ack<GrantedSeat>>
  ): Promise<Refusal> => {
    const result = await send()
    if (result.ok) takeSeat(result.data, nickname)
    return refusalOf(result)
  }

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getState: (): GameSessionState => state,

    start(): void {
      if (started) return
      started = true
      const inviteCode = address.invitedRoomCode()
      const stored = seats.load()
      const seat =
        stored && (!inviteCode || stored.code === inviteCode) ? stored : null
      if (stored && !seat) seats.forget()
      update({ seat, inviteCode, restoring: seat !== null })
      gateway.connect({
        onConnected() {
          update({ connection: "online" })
          if (state.seat) void restoreSeat(state.seat)
        },
        onConnectionFailed() {
          update({ connection: "offline" })
        },
        onDisconnected(reason) {
          update({
            connection: reason === "replaced" ? "replaced" : "offline",
            restoring: false,
          })
        },
        onRoomState: applyRoomState,
        onRemoved() {
          dropSeat(REMOVED_NOTICE)
        },
      })
    },

    resumeHere(): void {
      update({ connection: "connecting" })
      gateway.resume()
    },

    giveUpRestoring(): void {
      dropSeat(null)
      if (gateway.isConnected()) gateway.restart()
    },

    dismissNotice(): void {
      if (state.notice) update({ notice: null })
    },

    createRoom: (nickname: string): Promise<Refusal> =>
      enterRoom(nickname, () => gateway.send("room:create", { nickname })),

    joinRoom: (code: string, nickname: string): Promise<Refusal> =>
      enterRoom(nickname, () => gateway.send("room:join", { code, nickname })),

    async leaveRoom(): Promise<void> {
      const result = await gateway.send("room:leave")
      dropSeat(null)
      if (!result.ok && gateway.isConnected()) gateway.restart()
    },

    startMatch: async (): Promise<Refusal> =>
      refusalOf(await gateway.send("game:start")),

    kickPlayer: async (playerId: PlayerId): Promise<Refusal> =>
      refusalOf(await gateway.send("room:kick", { playerId })),

    playAction: async (action: TurnAction): Promise<Refusal> =>
      refusalOf(await gateway.send("game:action", action)),

    async fetchHints(): Promise<Hints | null> {
      const result = await gateway.send("game:hints")
      return result.ok ? result.data : null
    },
  }
}

export type GameSession = ReturnType<typeof createGameSession>

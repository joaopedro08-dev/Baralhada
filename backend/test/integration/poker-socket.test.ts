import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { io } from "socket.io-client"
import type { Socket } from "socket.io-client"
import type {
  Ack,
  RoomStateDto as AnyRoomStateDto,
  SeatDto,
} from "../../src/adapters/socket/contract.js"
import type {
  PokerHintsDto,
  PokerStateDto,
} from "../../src/adapters/socket/games/poker/contract.js"
import { startApp } from "../../src/main/app.js"
import type { RunningApp } from "../../src/main/app.js"
import { loadConfig } from "../../src/main/config.js"

type RoomStateDto = Omit<AnyRoomStateDto, "game"> & { readonly game: PokerStateDto | null }

const POKER = "poker-texas-holdem"
const silentLogger = { info: () => undefined, error: () => undefined }
const MAX_DECISIONS = 600

let app: RunningApp
let url: string
const opened: Socket[] = []
const latest = new WeakMap<Socket, RoomStateDto>()

const connect = async (): Promise<Socket> => {
  const socket = io(url, { transports: ["websocket"], forceNew: true, reconnection: false })
  opened.push(socket)
  socket.on("room:state", (state: RoomStateDto) => latest.set(socket, state))
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve)
    socket.once("connect_error", reject)
  })
  return socket
}

const request = <T>(socket: Socket, event: string, payload?: unknown): Promise<Ack<T>> =>
  new Promise((resolve) => {
    if (payload === undefined) socket.emit(event, resolve)
    else socket.emit(event, payload, resolve)
  })

const expectData = async <T>(pending: Promise<Ack<T>>): Promise<T> => {
  const ack = await pending
  if (!ack.ok) throw new Error(ack.error.code)
  return ack.data
}

const expectError = async (pending: Promise<Ack<unknown>>) => {
  const ack = await pending
  if (ack.ok) throw new Error("esperava recusa")
  return ack.error
}

const nextState = (socket: Socket, predicate: (state: RoomStateDto) => boolean) =>
  new Promise<RoomStateDto>((resolve) => {
    const current = latest.get(socket)
    if (current && predicate(current)) return resolve(current)
    const listener = (state: RoomStateDto) => {
      if (!predicate(state)) return
      socket.off("room:state", listener)
      resolve(state)
    }
    socket.on("room:state", listener)
  })

const NICKNAMES = ["Ana", "Beto", "Caio", "Duda", "Edu", "Fabi", "Gabi"]

const createTable = async (count: number) => {
  const host = await connect()
  const seat = await expectData(
    request<SeatDto>(host, "room:create", { nickname: "Ana", gameId: POKER })
  )
  const sockets = [host]
  for (const nickname of NICKNAMES.slice(1, count)) {
    const socket = await connect()
    await expectData(request<SeatDto>(socket, "room:join", { code: seat.code, nickname }))
    sockets.push(socket)
  }
  await nextState(host, (state) => state.players.length === count)
  return { host, sockets, code: seat.code }
}

const startTable = async (count: number) => {
  const table = await createTable(count)
  await expectData(request(table.host, "game:start"))
  const states = await Promise.all(
    table.sockets.map((socket) => nextState(socket, (state) => state.status === "playing"))
  )
  const current = states.findIndex((state) => state.game?.currentPlayerId === state.viewerId)
  return { ...table, states, current }
}

beforeAll(async () => {
  const config = loadConfig({
    PORT: "0",
    METRICS_PORT: "0",
    LOG_LEVEL: "silent",
    NODE_ENV: "test",
    PUBLIC_URL: "https://baralhada.test",
    ROOM_CREATIONS_PER_MINUTE: "100000",
    ROOM_JOINS_PER_MINUTE: "100000",
    MAX_CONNECTIONS_PER_IP: "100000",
    MATCH_COUNTDOWN_SECONDS: "0",
    TABLE_PAUSE_MS: "0",
    MAX_ROOMS: "1000",
    MAX_ROOMS_PER_IP: "1000",
  })
  app = await startApp(config, silentLogger)
  url = `http://127.0.0.1:${app.port}`
})

afterEach(() => {
  while (opened.length > 0) opened.pop()?.disconnect()
})

afterAll(async () => {
  await app.stop()
})

describe("PK-RN-01 sala do Poker", () => {
  it("aceita de 2 a 6 jogadores com 30 s por vez", async () => {
    const { host, code } = await createTable(6)
    const lobby = latest.get(host) as RoomStateDto
    expect(lobby.gameId).toBe(POKER)
    expect(lobby.teams).toBeNull()
    expect(lobby.turnDurationMs).toBe(30_000)
    expect(lobby.canStart).toBe(true)
    const seventh = await connect()
    const refusal = await expectError(
      request<SeatDto>(seventh, "room:join", { code, nickname: "Gabi" })
    )
    expect(refusal.code).toBe("ROOM_FULL")
  })
})

describe("PK-RF-01 a PK-RF-09 partida pelo socket", () => {
  it("distribui 2 cartas fechadas, cobra as blinds e esconde as cartas dos outros", async () => {
    const { states } = await startTable(3)
    for (const state of states) {
      const game = state.game as PokerStateDto
      expect(game.hole).toHaveLength(2)
      expect(game.potTotal).toBe(30)
      expect(game.blinds).toEqual({ small: 10, big: 20 })
      expect(game.handsUntilBlindsRise).toBe(10)
      expect(game.players.map((player) => player.chips).sort()).toEqual([1000, 980, 990].sort())
      const frame = JSON.stringify(state)
      for (const other of states.filter((peer) => peer !== state)) {
        for (const card of other.game?.hole ?? []) expect(frame).not.toContain(`"${card}"`)
      }
    }
  })

  it("recusa ação inválida com o motivo e passa a vez para todos", async () => {
    const { sockets, current } = await startTable(3)
    const actor = sockets[current] as Socket
    const other = sockets[(current + 1) % 3] as Socket

    expect((await expectError(request(other, "game:action", { type: "fold" }))).code).toBe(
      "NOT_YOUR_TURN"
    )
    expect(await expectError(request(actor, "game:action", { type: "check" }))).toEqual({
      code: "CANNOT_CHECK",
      message: "Há aposta na mesa: pague, aumente ou desista.",
    })
    expect(
      (await expectError(request(actor, "game:action", { type: "raise", amount: 25 }))).code
    ).toBe("AMOUNT_TOO_SMALL")
    expect(
      (await expectError(request(actor, "game:action", { type: "raise", amount: "x" }))).code
    ).toBe("INVALID_PAYLOAD")

    const passed = nextState(other, (state) => state.game?.turnNumber === 2)
    await expectData(request(actor, "game:action", { type: "raise", amount: 60 }))
    const seen = await passed
    expect(seen.game?.currentBet).toBe(60)
    expect(seen.game?.history[0]).toMatch(/aumentou para 60$/)
  })

  it("entrega o jogo atual como dica (PK-RF-12)", async () => {
    const { sockets, current } = await startTable(2)
    const hints = await expectData(request<PokerHintsDto>(sockets[current] as Socket, "game:hints"))
    expect(hints.kind).toBe(POKER)
    expect(hints.current?.cards).toHaveLength(2)
    expect(hints.sentences[0]).toMatch(/^Você tem /)
  })

  it("três navegadores jogam até sobrar um vencedor", async () => {
    const { sockets } = await startTable(3)
    for (let decision = 0; decision < MAX_DECISIONS; decision++) {
      const states = await Promise.all(
        sockets.map((socket) =>
          nextState(socket, (next) => next.status === "finished" || next.game?.pending === null)
        )
      )
      if (states[0]?.status === "finished") break
      const index = states.findIndex((state) => state.game?.currentPlayerId === state.viewerId)
      const socket = sockets[index] as Socket
      const state = states[index] as RoomStateDto
      const moves = state.game?.moves
      const action = moves?.raise
        ? { type: "raise", amount: moves.raise.max }
        : moves?.bet
          ? { type: "bet", amount: moves.bet.max }
          : moves?.call !== null
            ? { type: "call" }
            : { type: "check" }
      await expectData(request(socket, "game:action", action))
      await Promise.all(
        sockets.map((peer) => nextState(peer, (next) => next.version > state.version))
      )
    }
    const final = await nextState(sockets[0] as Socket, (state) => state.status === "finished")
    const game = final.game as PokerStateDto
    expect(game.endReason).toBe("chips")
    expect(game.eliminatedIds).toHaveLength(2)
    const winner = game.players.find((player) => player.id === game.winnerId)
    expect(winner?.chips).toBe(3000)
    expect(game.history[0]).toMatch(/venceu a partida com todas as fichas$/)
  })
})

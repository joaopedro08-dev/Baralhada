import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { io } from "socket.io-client"
import type { Socket } from "socket.io-client"
import type {
  Ack,
  RoomStateDto as AnyRoomStateDto,
  SeatDto,
} from "../../src/adapters/socket/contract.js"
import type {
  CachetaHintsDto,
  CachetaStateDto,
} from "../../src/adapters/socket/games/cacheta/contract.js"
import { startApp } from "../../src/main/app.js"
import type { RunningApp } from "../../src/main/app.js"
import { loadConfig } from "../../src/main/config.js"

type RoomStateDto = Omit<AnyRoomStateDto, "game"> & { readonly game: CachetaStateDto | null }

const CACHETA = "cacheta"
const silentLogger = { info: () => undefined, error: () => undefined }

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

const NICKNAMES = ["Ana", "Beto", "Caio", "Duda", "Edu"]

const createTable = async (count: number) => {
  const host = await connect()
  const seat = await expectData(
    request<SeatDto>(host, "room:create", { nickname: "Ana", gameId: CACHETA })
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
    PUBLIC_URL: "https://naipe-real.test",
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

describe("CA-RN-01 sala da Cacheta", () => {
  it("aceita de 2 a 4 jogadores com 30 s por vez", async () => {
    const { host, code } = await createTable(4)
    const lobby = latest.get(host) as RoomStateDto
    expect(lobby.gameId).toBe(CACHETA)
    expect(lobby.teams).toBeNull()
    expect(lobby.turnDurationMs).toBe(30_000)
    expect(lobby.canStart).toBe(true)
    const fifth = await connect()
    const refusal = await expectError(
      request<SeatDto>(fifth, "room:join", { code, nickname: "Edu" })
    )
    expect(refusal.code).toBe("ROOM_FULL")
  })
})

describe("CA-RF-01 a CA-RF-04 partida pelo socket", () => {
  it("distribui 9 cartas, mostra o vira e o coringa e esconde as mãos dos outros", async () => {
    const { states } = await startTable(3)
    for (const state of states) {
      const game = state.game as CachetaStateDto
      expect(game.hand).toHaveLength(9)
      expect(game.stockSize).toBe(104 - 27 - 1)
      expect(game.round).toBe(1)
      expect(game.history[0]).toMatch(/^Rodada 1: a vira é .* é o coringa$/)
      expect(game.players.every((player) => player.points === 10)).toBe(true)
      const visible = new Set([...game.hand, game.vira])
      const frame = JSON.stringify(state)
      const hidden = states
        .filter((peer) => peer !== state)
        .flatMap((peer) => peer.game?.hand ?? [])
        .filter((card) => !visible.has(card))
      for (const card of hidden) expect(frame).not.toContain(`"${card}"`)
    }
  })

  it("compra, recusa com o motivo, descarta e passa a vez para todos", async () => {
    const { sockets, states, current } = await startTable(2)
    const actor = sockets[current] as Socket
    const other = sockets[(current + 1) % 2] as Socket
    const actorState = states[current] as RoomStateDto

    expect(actorState.game?.moves).toEqual({
      draw: true,
      take: false,
      discard: false,
      knock: false,
    })
    expect((await expectError(request(other, "game:action", { type: "draw" }))).code).toBe(
      "NOT_YOUR_TURN"
    )
    const early = await expectError(
      request(actor, "game:action", { type: "discard", card: actorState.game?.hand[0] })
    )
    expect(early).toEqual({
      code: "PICK_BEFORE_DISCARD",
      message: "Compre do monte ou pegue a carta do descarte antes de descartar.",
    })
    expect((await expectError(request(actor, "game:action", { type: "take" }))).code).toBe(
      "EMPTY_DISCARD"
    )

    await expectData(request(actor, "game:action", { type: "draw" }))
    const drawn = await nextState(actor, (state) => state.game?.stage === "drawn")
    expect(drawn.game?.hand).toHaveLength(10)
    expect(drawn.game?.drawnCard).not.toBeNull()
    const card = drawn.game?.drawnCard
    const passed = nextState(other, (state) => state.game?.currentPlayerId === state.viewerId)
    await expectData(request(actor, "game:action", { type: "discard", card }))
    const seen = await passed
    expect(seen.game?.discardTop).toBe(card)
    expect(seen.game?.moves).toEqual({ draw: true, take: true, discard: false, knock: false })
    expect(seen.game?.history[0]).toMatch(/descartou/)

    await expectData(request(other, "game:action", { type: "take" }))
    const taken = await nextState(other, (state) => state.game?.stage === "drawn")
    expect(taken.game?.hand).toContain(card)
    expect(taken.game?.discardTop).toBeNull()
  })

  it("entrega dicas da Cacheta a quem está na vez", async () => {
    const { sockets, current } = await startTable(2)
    const hints = await expectData(
      request<CachetaHintsDto>(sockets[current] as Socket, "game:hints")
    )
    expect(hints.kind).toBe(CACHETA)
    expect(hints.knock).toBeNull()
    expect(hints.suggestions).toEqual([
      {
        action: { type: "draw" },
        sentence: "Compre do monte: a carta do descarte não ajuda seus jogos.",
      },
    ])
  })
})

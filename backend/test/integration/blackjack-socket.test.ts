import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { io } from "socket.io-client"
import type { Socket } from "socket.io-client"
import type {
  Ack,
  RoomStateDto as AnyRoomStateDto,
  SeatDto,
} from "../../src/adapters/socket/contract.js"
import type {
  BlackjackHintsDto,
  BlackjackStateDto,
} from "../../src/adapters/socket/games/blackjack/contract.js"
import { startApp } from "../../src/main/app.js"
import type { RunningApp } from "../../src/main/app.js"
import { loadConfig } from "../../src/main/config.js"

type RoomStateDto = Omit<AnyRoomStateDto, "game"> & { readonly game: BlackjackStateDto | null }

const BLACKJACK = "blackjack"
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
    request<SeatDto>(host, "room:create", { nickname: "Ana", gameId: BLACKJACK })
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

const isDealt = (state: RoomStateDto) =>
  state.status === "finished" ||
  (state.game !== null && state.game.phase !== "betting" && state.game.phase !== "dealing")

const playing = (state: RoomStateDto) => state.status === "playing" && state.game !== null

describe("BJ-RN-01 e BJ-RF-11 sala do Blackjack", () => {
  it("aceita de 1 a 6 jogadores e deixa começar sozinho", async () => {
    const { host } = await createTable(1)
    const lobby = latest.get(host) as RoomStateDto
    expect(lobby.gameId).toBe(BLACKJACK)
    expect(lobby.turnDurationMs).toBe(30_000)
    expect(lobby.canStart).toBe(true)
  })
})

describe("BJ-RF-01 a BJ-RF-04 partida pelo socket", () => {
  it("aposta, distribui e nunca manda a carta escondida da banca", async () => {
    const { sockets } = await startTable(2)
    const [ana, beto] = sockets as [Socket, Socket]
    const opening = await nextState(ana, playing)
    expect(opening.game).toMatchObject({ phase: "betting", round: 1, rounds: 10 })
    expect(opening.game?.moves.bet).toEqual({ min: 10, max: 1000, step: 10 })
    const wrong = await expectError(request(ana, "game:action", { type: "bet", amount: 15 }))
    expect(wrong).toEqual({
      code: "INVALID_BET",
      message: "Aposte de 10 em 10, de 10 fichas até todas as que você tem.",
    })
    await expectData(request(ana, "game:action", { type: "bet", amount: 100 }))
    const waiting = await nextState(beto, (state) => state.game?.players[0]?.bet === 100)
    expect(waiting.game?.phase).toBe("betting")
    const frames: string[] = []
    ana.on("room:state", (state) => frames.push(JSON.stringify(state)))
    await expectData(request(beto, "game:action", { type: "bet", amount: 50 }))
    const dealt = await nextState(ana, (state) => isDealt(state))
    const hands = dealt.game?.players.map((seat) => seat.hands[0]?.cards.length)
    expect(hands).toEqual([2, 2])
    if (dealt.game?.phase === "playing") {
      expect(dealt.game.dealer).toMatchObject({ hidden: 1 })
      expect(dealt.game.dealer.cards).toHaveLength(1)
    }
    expect(frames.every((frame) => !frame.includes('"deck"'))).toBe(true)
  })

  it("um jogador sozinho joga as 10 rodadas até o fim", async () => {
    const { host } = await startTable(1)
    for (let round = 1; round <= 10; round++) {
      const betting = await nextState(
        host,
        (state) =>
          state.status === "finished" ||
          (state.game?.phase === "betting" &&
            state.game.round === round &&
            state.game.moves.bet !== null)
      )
      if (betting.status === "finished") break
      await expectData(request(host, "game:action", { type: "bet", amount: 10 }))
      const turn = await nextState(host, (state) => isDealt(state) || state.status === "finished")
      if (turn.game?.moves.stand) {
        await expectData(request(host, "game:action", { type: "stand" }))
      }
    }
    const final = await nextState(host, (state) => state.status === "finished")
    expect(final.game?.endReason).toBe("rounds")
    expect(final.game?.round).toBe(10)
    expect(final.game?.history[0]).toMatch(/venceu com mais fichas|terminou/)
  })

  it("entrega a dica de estratégia a quem está na vez", async () => {
    const { host } = await startTable(1)
    await nextState(host, (state) => state.game?.moves.bet !== null)
    await expectData(request(host, "game:action", { type: "bet", amount: 10 }))
    const dealt = await nextState(host, (state) => isDealt(state))
    const hints = await expectData(request<BlackjackHintsDto>(host, "game:hints"))
    expect(hints.kind).toBe(BLACKJACK)
    if (dealt.game?.phase === "playing" && dealt.game.moves.hit) {
      expect(hints.advice?.sentence).toMatch(/^(Peça|Pare|Dobre|Divida)/)
    }
  })
})

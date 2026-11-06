import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { io } from "socket.io-client"
import type { Socket } from "socket.io-client"
import type {
  Ack,
  RoomStateDto as AnyRoomStateDto,
  SeatDto,
} from "../../src/adapters/socket/contract.js"
import type {
  TrucoHintsDto,
  TrucoStateDto,
} from "../../src/adapters/socket/games/truco/contract.js"
import { startApp } from "../../src/main/app.js"
import type { RunningApp } from "../../src/main/app.js"
import { loadConfig } from "../../src/main/config.js"

type RoomStateDto = Omit<AnyRoomStateDto, "game"> & { readonly game: TrucoStateDto | null }

const TRUCO = "truco-paulista"
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

const expectErrorCode = async (pending: Promise<Ack<unknown>>): Promise<string> => {
  const ack = await pending
  if (ack.ok) throw new Error("esperava recusa")
  return ack.error.code
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

const createTable = async (count: number) => {
  const host = await connect()
  const seat = await expectData(
    request<SeatDto>(host, "room:create", { nickname: "Ana", gameId: TRUCO })
  )
  const guests: Socket[] = []
  for (const nickname of ["Beto", "Caio", "Duda", "Edu", "Fia"].slice(0, count - 1)) {
    const socket = await connect()
    await expectData(request<SeatDto>(socket, "room:join", { code: seat.code, nickname }))
    guests.push(socket)
  }
  const sockets = [host, ...guests]
  await nextState(host, (state) => state.players.length === count)
  return { host, sockets, code: seat.code }
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

describe("RF-25 escolha do jogo", () => {
  it("cria a sala no Rouba Monte e o anfitrião troca para o Truco; todos veem", async () => {
    const host = await connect()
    const seat = await expectData(request<SeatDto>(host, "room:create", { nickname: "Ana" }))
    const guest = await connect()
    await expectData(request<SeatDto>(guest, "room:join", { code: seat.code, nickname: "Beto" }))

    expect(await expectErrorCode(request(guest, "room:game", { gameId: TRUCO }))).toBe("NOT_HOST")
    expect(await expectErrorCode(request(host, "room:game", { gameId: "xadrez" }))).toBe(
      "UNKNOWN_GAME"
    )
    expect(await expectErrorCode(request(host, "room:game", { gameId: "<script>" }))).toBe(
      "INVALID_PAYLOAD"
    )

    const seen = nextState(guest, (state) => state.gameId === TRUCO)
    await expectData(request(host, "room:game", { gameId: TRUCO }))
    const state = await seen
    expect(state.teams).toEqual([[state.players[0]?.id], [state.players[1]?.id]])
    expect(state.turnDurationMs).toBe(30_000)
    expect(state.canStart).toBe(true)
  })
})

describe("TR-RF-09 times na sala", () => {
  it("bloqueia 3 jogadores e times desiguais, e o anfitrião move ou sorteia", async () => {
    const { host, sockets } = await createTable(3)
    const lobby = latest.get(host) as RoomStateDto
    expect(lobby.startProblem).toBe("NOT_ENOUGH_PLAYERS")
    expect(await expectErrorCode(request(host, "game:start"))).toBe("NOT_ENOUGH_PLAYERS")

    const fourth = await connect()
    await expectData(request<SeatDto>(fourth, "room:join", { code: lobby.code, nickname: "Duda" }))
    const full = await nextState(host, (state) => state.players.length === 4)
    expect(full.teams?.map((team) => team.length)).toEqual([2, 2])

    const [, second] = full.players
    const moved = nextState(host, (state) => state.startProblem === "TEAMS_UNBALANCED")
    await expectData(request(host, "room:team", { playerId: second?.id, team: 0 }))
    expect((await moved).teams?.[0]).toContain(second?.id)
    expect(await expectErrorCode(request(sockets[1] as Socket, "room:teams-draw"))).toBe("NOT_HOST")
    expect(
      await expectErrorCode(request(host, "room:team", { playerId: second?.id, team: 5 }))
    ).toBe("INVALID_TEAM")

    const drawn = nextState(host, (state) => state.canStart)
    await expectData(request(host, "room:teams-draw"))
    expect((await drawn).teams?.map((team) => team.length)).toEqual([2, 2])
  })

  it("recusa mexer em times no Rouba Monte", async () => {
    const host = await connect()
    await expectData(request<SeatDto>(host, "room:create", { nickname: "Ana" }))
    expect(await expectErrorCode(request(host, "room:teams-draw"))).toBe("GAME_HAS_NO_TEAMS")
  })
})

describe("TR-RF-01 a TR-RF-06 partida de 4 jogadores", () => {
  const start = async () => {
    const table = await createTable(4)
    await expectData(request(table.host, "game:start"))
    const states = await Promise.all(
      table.sockets.map((socket) => nextState(socket, (state) => state.status === "playing"))
    )
    return { ...table, states }
  }

  it("distribui 3 cartas, mostra a vira e esconde as mãos dos outros", async () => {
    const { states } = await start()
    for (const state of states) {
      expect(state.game?.hand).toHaveLength(3)
      expect(state.game?.vira).toMatch(/^(A|[2-7]|J|Q|K)[CDHS]$/)
      expect(state.game?.scores).toEqual([0, 0])
      expect(state.game?.stake).toBe(1)
    }
    for (const state of states) {
      const frame = JSON.stringify(state)
      for (const other of states.filter((peer) => peer !== state)) {
        for (const card of other.game?.hand ?? []) expect(frame).not.toContain(`"${card}"`)
      }
    }
  })

  it("joga carta, pede truco, aceita e todos veem o valor da mão", async () => {
    const { sockets, states } = await start()
    const actorIndex = states.findIndex((state) => state.game?.actorId === state.viewerId)
    const actor = sockets[actorIndex] as Socket
    const actorState = states[actorIndex] as RoomStateDto
    const idle = sockets[(actorIndex + 2) % 4] as Socket
    expect(actorState.game?.moves).toMatchObject({ play: true, raiseTo: 3 })

    expect(
      await expectErrorCode(request(idle, "game:action", { type: "play", card: "QH" }))
    ).toMatch(/NOT_YOUR_TURN|CARD_NOT_IN_HAND/)
    expect(
      await expectErrorCode(request(actor, "game:action", { type: "discard", card: "QH" }))
    ).toBe("INVALID_PAYLOAD")

    const asked = nextState(idle, (state) => state.game?.request?.stake === 3)
    await expectData(request(actor, "game:action", { type: "raise" }))
    const pending = await asked
    expect(pending.game?.history[0]).toBe(`${actorState.players[actorIndex]?.nickname} pediu truco`)

    const responderIndex = states.findIndex(
      (state) => state.viewerId === pending.game?.request?.responderId
    )
    const responder = sockets[responderIndex] as Socket
    const accepted = nextState(idle, (state) => state.game?.stake === 3 && !state.game.request)
    await expectData(request(responder, "game:action", { type: "accept" }))
    expect((await accepted).game?.history[0]).toMatch(/aceitou: a mão vale 3 pontos/)

    const card = actorState.game?.hand[0]
    const played = nextState(idle, (state) => (state.game?.table.length ?? 0) === 1)
    await expectData(request(actor, "game:action", { type: "play", card }))
    expect((await played).game?.table[0]).toEqual({
      playerId: actorState.viewerId,
      card,
      covered: false,
    })
  })

  it("dá dicas só com a própria mão e régua de força", async () => {
    const { sockets, states } = await start()
    const actorIndex = states.findIndex((state) => state.game?.actorId === state.viewerId)
    const hints = await expectData(
      request<TrucoHintsDto>(sockets[actorIndex] as Socket, "game:hints")
    )
    expect(hints.kind).toBe(TRUCO)
    expect(hints.order).toHaveLength(9)
    expect(hints.hand.map((entry) => entry.card).sort()).toEqual(
      [...(states[actorIndex]?.game?.hand ?? [])].sort()
    )
    expect(hints.suggestions.length).toBeGreaterThan(0)
  })

  it("TR-RN-15 quem sai pelo botão faz o time perder", async () => {
    const { sockets, states } = await start()
    const leaver = states[1] as RoomStateDto
    const leaverTeam = leaver.game?.viewerTeam
    const ended = nextState(sockets[0] as Socket, (state) => state.status === "finished")
    await expectData(request(sockets[1] as Socket, "room:leave"))
    const finished = await ended
    expect(finished.game?.endReason).toBe("abandoned")
    expect(finished.game?.winnerTeam).toBe(leaverTeam === 0 ? 1 : 0)
    const teamOfPlayer = (state: RoomStateDto, id: string) =>
      state.teams?.findIndex((members) => members.includes(id))
    for (const player of finished.players) {
      expect(teamOfPlayer(finished, player.id)).toBe(
        teamOfPlayer(states[0] as RoomStateDto, player.id)
      )
    }
  })
})

describe("dicas decididas pelo anfitrião", () => {
  it("o anfitrião desliga as dicas antes da partida e ninguém recebe dicas", async () => {
    const { host, sockets } = await createTable(2)
    const guest = sockets[1] as Socket
    expect(latest.get(guest)?.hintsAllowed).toBe(true)
    expect(await expectErrorCode(request(guest, "room:hints", { allowed: false }))).toBe("NOT_HOST")
    expect(await expectErrorCode(request(host, "room:hints", { allowed: "não" }))).toBe(
      "INVALID_PAYLOAD"
    )

    const seen = nextState(guest, (state) => !state.hintsAllowed)
    await expectData(request(host, "room:hints", { allowed: false }))
    await seen

    const playing = nextState(guest, (state) => state.status === "playing")
    await expectData(request(host, "game:start"))
    await playing
    for (const socket of sockets) {
      expect(await expectErrorCode(request(socket, "game:hints"))).toBe("HINTS_DISABLED")
    }
    expect(await expectErrorCode(request(host, "room:hints", { allowed: true }))).toBe(
      "GAME_ALREADY_STARTED"
    )
  })
})

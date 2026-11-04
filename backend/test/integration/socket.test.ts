import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { io } from "socket.io-client"
import type { Socket } from "socket.io-client"
import type { Ack, HintsDto, RoomStateDto, SeatDto } from "../../src/adapters/socket/contract.js"
import { startApp } from "../../src/main/app.js"
import type { RunningApp } from "../../src/main/app.js"
import { loadConfig } from "../../src/main/config.js"

const silentLogger = { info: () => undefined, error: () => undefined }

let app: RunningApp
let url: string
const opened: Socket[] = []

const connect = async (): Promise<Socket> => {
  const socket = io(url, { transports: ["websocket"], forceNew: true, reconnection: false })
  opened.push(socket)
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

const nextState = (socket: Socket, predicate: (state: RoomStateDto) => boolean = () => true) =>
  new Promise<RoomStateDto>((resolve) => {
    const listener = (state: RoomStateDto) => {
      if (!predicate(state)) return
      socket.off("room:state", listener)
      resolve(state)
    }
    socket.on("room:state", listener)
  })

const idleSocketViewerId = (state: RoomStateDto): string => state.viewerId

const createLobby = async () => {
  const hostSocket = await connect()
  const host = await expectData(request<SeatDto>(hostSocket, "room:create", { nickname: "Ana" }))
  const guestSocket = await connect()
  const guest = await expectData(
    request<SeatDto>(guestSocket, "room:join", { code: host.code, nickname: "Beto" })
  )
  return { hostSocket, guestSocket, host, guest }
}

beforeAll(async () => {
  const config = loadConfig({
    PORT: "0",
    METRICS_PORT: "0",
    LOG_LEVEL: "silent",
    NODE_ENV: "test",
    PUBLIC_URL: "https://roubamonte.test",
    ROOM_CREATIONS_PER_MINUTE: "100000",
    ROOM_JOINS_PER_MINUTE: "100000",
    MAX_CONNECTIONS_PER_IP: "100000",
    MATCH_COUNTDOWN_SECONDS: "0",
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

describe("HTTP", () => {
  it("responde saúde e prontidão", async () => {
    expect((await fetch(`${url}/healthz`)).status).toBe(200)
    expect(await (await fetch(`${url}/readyz`)).json()).toEqual({ status: "ready" })
    expect((await fetch(`${url}/qualquer`)).status).toBe(404)
  })

  it("expõe métricas só na porta interna", async () => {
    await createLobby()
    const metrics = await (await fetch(`http://127.0.0.1:${app.metricsPort}/metrics`)).text()

    expect(metrics).toContain("roubamonte_commands_total")
    expect(metrics).toContain("nodejs_eventloop_lag_p99_seconds")
    expect((await fetch(`${url}/metrics`)).status).toBe(404)
  })
})

describe("RF-01 a RF-03 sala", () => {
  it("cria código de 6 caracteres e link de convite", async () => {
    const socket = await connect()
    const seat = await expectData(request<SeatDto>(socket, "room:create", { nickname: "Ana" }))

    expect(seat.code).toMatch(/^[2-9A-HJ-NP-Z]{6}$/)
    expect(seat.inviteUrl).toBe(`https://roubamonte.test/?sala=${seat.code}`)
  })

  it("avisa todos quando alguém entra e sai", async () => {
    const hostSocket = await connect()
    const host = await expectData(request<SeatDto>(hostSocket, "room:create", { nickname: "Ana" }))

    const joined = nextState(hostSocket, (state) => state.players.length === 2)
    const guestSocket = await connect()
    await expectData(
      request<SeatDto>(guestSocket, "room:join", {
        code: host.code.toLowerCase(),
        nickname: "Beto",
      })
    )
    expect((await joined).canStart).toBe(true)

    const left = nextState(hostSocket, (state) => state.players.length === 1)
    await expectData(request(guestSocket, "room:leave"))
    expect((await left).players.map((player) => player.nickname)).toEqual(["Ana"])
  })

  it("recusa com o motivo em português", async () => {
    const socket = await connect()
    const ack = await request(socket, "room:join", { code: "ZZZZZZ", nickname: "Ana" })
    expect(ack).toEqual({
      ok: false,
      error: { code: "ROOM_NOT_FOUND", message: "Sala não encontrada." },
    })
  })
})

describe("RF-09 validação das mensagens", () => {
  it.each([
    ["room:create", { nickname: "" }],
    ["room:create", { nickname: "<script>" }],
    ["room:create", { nickname: "A", extra: true }],
    ["room:join", { code: "abc", nickname: "A" }],
    ["room:create", "texto"],
  ])("recusa %s inválido %j", async (event, payload) => {
    const socket = await connect()
    expect(await expectErrorCode(request(socket, event, payload))).toBe("INVALID_PAYLOAD")
  })

  it("recusa ação com carta inexistente", async () => {
    const { hostSocket } = await createLobby()
    expect(
      await expectErrorCode(request(hostSocket, "game:action", { type: "discard", card: "1Z" }))
    ).toBe("INVALID_PAYLOAD")
  })

  it("recusa comando sem estar numa sala", async () => {
    const socket = await connect()
    expect(await expectErrorCode(request(socket, "game:start"))).toBe("NOT_IN_ROOM")
  })

  it("recusa entrar em duas salas pela mesma conexão", async () => {
    const { hostSocket } = await createLobby()
    expect(await expectErrorCode(request(hostSocket, "room:create", { nickname: "Ana" }))).toBe(
      "ALREADY_IN_ROOM"
    )
  })

  it("limita rajadas de comandos", async () => {
    const socket = await connect()
    const responses = await Promise.all(
      Array.from({ length: 80 }, () => request(socket, "game:start"))
    )
    const codes = responses.map((ack) => (ack.ok ? "ok" : ack.error.code))
    expect(codes).toContain("RATE_LIMITED")
  })
})

describe("partida pela rede", () => {
  const startMatch = async () => {
    const lobby = await createLobby()
    const hostState = nextState(lobby.hostSocket, (state) => state.status === "playing")
    const guestState = nextState(lobby.guestSocket, (state) => state.status === "playing")
    await expectData(request(lobby.hostSocket, "game:start"))
    const [hostView, guestView] = await Promise.all([hostState, guestState])
    const hostTurn = hostView.game?.currentPlayerId === lobby.host.playerId
    return {
      ...lobby,
      hostView,
      guestView,
      activeSocket: hostTurn ? lobby.hostSocket : lobby.guestSocket,
      activeView: hostTurn ? hostView : guestView,
      idleSocket: hostTurn ? lobby.guestSocket : lobby.hostSocket,
      idleView: hostTurn ? guestView : hostView,
    }
  }

  it("RF-07 distribui e informa o prazo do turno", async () => {
    const { hostView } = await startMatch()
    expect(hostView.game?.hand).toHaveLength(4)
    expect(hostView.game?.table).toHaveLength(10)
    expect(hostView.game?.deckSize).toBe(34)
    expect(hostView.turnDeadlineAt).toBeGreaterThan(Date.now())
  })

  it("RNF-04 nenhum pacote traz carta escondida", async () => {
    const { activeSocket, activeView, idleSocket, idleView } = await startMatch()
    const idleFrames: string[] = [JSON.stringify(idleView)]
    const activeFrames: string[] = [JSON.stringify(activeView)]
    idleSocket.onAny((_event, payload) => idleFrames.push(JSON.stringify(payload)))
    activeSocket.onAny((_event, payload) => activeFrames.push(JSON.stringify(payload)))

    const received = nextState(idleSocket, (state) => state.game?.deckSize === 33)
    await expectData(request(activeSocket, "game:action", { type: "draw" }))
    await received

    const cardsIn = (frame: string) => frame.match(/"(?:10|[2-9AJQK])[CDHS]"/g) ?? []
    const visibleToIdle = new Set(
      [...(idleView.game?.hand ?? []), ...(idleView.game?.table ?? [])].map((card) => `"${card}"`)
    )
    expect(idleFrames.flatMap(cardsIn).every((card) => visibleToIdle.has(card))).toBe(true)
    for (const frame of [...idleFrames, ...activeFrames]) {
      expect(frame).not.toContain("reconnectToken")
      expect(frame).not.toContain('"deck"')
    }
  })

  it("RF-08 só o jogador da vez consegue agir", async () => {
    const { idleSocket } = await startMatch()
    expect(await expectErrorCode(request(idleSocket, "game:action", { type: "draw" }))).toBe(
      "NOT_YOUR_TURN"
    )
  })

  it("RF-10 e RF-11 ação chega a todos e o turno passa", async () => {
    const { activeSocket, activeView, idleSocket, idleView } = await startMatch()
    const drawn = nextState(idleSocket, (state) => state.game?.deckSize === 33)
    await expectData(request(activeSocket, "game:action", { type: "draw" }))
    expect((await drawn).version).toBeGreaterThan(idleView.version)

    expect(await expectErrorCode(request(activeSocket, "game:endTurn"))).toBe("MUST_DISCARD")

    const card = activeView.game?.hand[0]
    const passed = nextState(idleSocket, (state) => state.game?.turnNumber === 2)
    await expectData(request(activeSocket, "game:action", { type: "discard", card }))
    expect((await passed).game?.canEndTurn).toBe(true)
  })

  it("RF-01 entrega o estado inicial a quem cria ou entra na sala", async () => {
    const socket = await connect()
    const state = nextState(socket)
    await expectData(request<SeatDto>(socket, "room:create", { nickname: "Ana" }))
    expect((await state).players.map((player) => player.nickname)).toEqual(["Ana"])
  })

  it("RF-13 histórico descreve as jogadas, da mais recente para a mais antiga", async () => {
    const { activeSocket, activeView, idleSocket } = await startMatch()
    const card = activeView.game?.hand[0]
    const drew = nextState(idleSocket, (state) => (state.game?.history.length ?? 0) === 1)
    await expectData(request(activeSocket, "game:action", { type: "draw" }))
    const first = await drew
    const discarded = nextState(idleSocket, (state) => (state.game?.history.length ?? 0) === 2)
    await expectData(request(activeSocket, "game:action", { type: "discard", card }))
    const history = (await discarded).game?.history ?? []

    expect(first.game?.history[0]).toMatch(/comprou 1 carta$/)
    expect(history[0]).toMatch(/descartou/)
    expect(history[1]).toMatch(/comprou 1 carta$/)
  })

  it("RF-16 a RF-19 dicas com frases em português", async () => {
    const { activeSocket, idleSocket } = await startMatch()
    const hints = await expectData(request<HintsDto>(activeSocket, "game:hints"))

    expect(hints.plays.length).toBeGreaterThan(0)
    expect(hints.plays[0]?.sentence).toMatch(/\.$/)
    expect(hints.cardCounts).toHaveLength(13)

    const idle = await expectData(request<HintsDto>(idleSocket, "game:hints"))
    expect(idle.plays).toEqual([])
  })

  it("RN-04 fecha o turno depois de uma jogada", async () => {
    const { activeSocket, activeView, idleSocket } = await startMatch()
    const card = activeView.game?.hand[0]
    const passed = nextState(idleSocket, (state) => state.game?.turnNumber === 2)
    await expectData(request(activeSocket, "game:action", { type: "discard", card }))
    expect((await passed).game?.currentPlayerId).toBe(idleSocketViewerId(await passed))
    expect(await expectErrorCode(request(activeSocket, "game:action", { type: "draw" }))).toBe(
      "NOT_YOUR_TURN"
    )
  })

  it("recusa conexão vinda de outro site", async () => {
    const foreign = io(url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      extraHeaders: { origin: "https://site-malicioso.test" },
    })
    opened.push(foreign)
    const refused = await new Promise((resolve) => {
      foreign.once("connect", () => resolve(false))
      foreign.once("connect_error", () => resolve(true))
    })
    expect(refused).toBe(true)
  })

  it("aceita conexão vinda do próprio endereço", async () => {
    const same = io(url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      extraHeaders: { origin: url },
    })
    opened.push(same)
    const connected = await new Promise((resolve) => {
      same.once("connect", () => resolve(true))
      same.once("connect_error", () => resolve(false))
    })
    expect(connected).toBe(true)
  })

  it("com o frontend em outro endereço, aceita só as origens de CORS_ORIGIN", async () => {
    const separated = await startApp(
      loadConfig({
        PORT: "0",
        METRICS_PORT: "0",
        LOG_LEVEL: "silent",
        NODE_ENV: "test",
        CORS_ORIGIN: "https://jogo.test/, https://outro.test",
      }),
      silentLogger
    )
    const connects = (origin: string) =>
      new Promise((resolve) => {
        const socket = io(`http://127.0.0.1:${separated.port}`, {
          transports: ["websocket"],
          forceNew: true,
          reconnection: false,
          extraHeaders: { origin },
        })
        opened.push(socket)
        socket.once("connect", () => resolve(true))
        socket.once("connect_error", () => resolve(false))
      })

    expect(await connects("https://jogo.test")).toBe(true)
    expect(await connects("https://outro.test")).toBe(true)
    expect(await connects("https://site-malicioso.test")).toBe(false)

    const polling = await fetch(
      `http://127.0.0.1:${separated.port}/socket.io/?EIO=4&transport=polling`,
      { headers: { origin: "https://jogo.test" } }
    )
    expect(polling.headers.get("access-control-allow-origin")).toBe("https://jogo.test")

    await separated.stop()
  })

  it("limita tentativas de entrar em salas por IP", async () => {
    const limited = await startApp(
      loadConfig({
        PORT: "0",
        METRICS_PORT: "0",
        LOG_LEVEL: "silent",
        NODE_ENV: "test",
        ROOM_JOINS_PER_MINUTE: "2",
      }),
      silentLogger
    )
    const guesser = io(`http://127.0.0.1:${limited.port}`, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    })
    opened.push(guesser)
    await new Promise((resolve) => guesser.once("connect", () => resolve(null)))
    const tryCode = () =>
      expectErrorCode(request(guesser, "room:join", { code: "ZZZZZZ", nickname: "Eva" }))

    expect(await tryCode()).toBe("ROOM_NOT_FOUND")
    expect(await tryCode()).toBe("ROOM_NOT_FOUND")
    expect(await tryCode()).toBe("RATE_LIMITED")

    await limited.stop()
  })

  it("sobrevive a mensagens inválidas em todos os comandos", async () => {
    const attacker = io(url, { transports: ["websocket"], forceNew: true, reconnection: false })
    opened.push(attacker)
    await new Promise((resolve) => attacker.once("connect", () => resolve(null)))
    const garbage: readonly unknown[] = [
      null,
      42,
      "texto",
      [],
      {},
      { nickname: 7 },
      { nickname: "<script>" },
      { code: "../../etc", nickname: "Eva" },
      { type: "takeFromTable", tableCards: ["5H", "5H", "5H", "5H", "5H"], handCards: [] },
      { type: "draw", extra: true },
      { __proto__: { admin: true }, nickname: "" },
    ]
    const commands = [
      "room:create",
      "room:join",
      "room:reconnect",
      "room:kick",
      "game:action",
    ] as const
    for (const command of commands) {
      for (const payload of garbage) {
        const answer = await attacker.timeout(5000).emitWithAck(command, payload)
        expect(answer.ok).toBe(false)
      }
      attacker.emit(command, { sem: "resposta" })
    }

    expect(attacker.connected).toBe(true)
    expect((await fetch(`${url}/readyz`)).status).toBe(200)
  })

  it("derruba só quem manda mensagem grande demais", async () => {
    const flooder = io(url, { transports: ["websocket"], forceNew: true, reconnection: false })
    opened.push(flooder)
    await new Promise((resolve) => flooder.once("connect", () => resolve(null)))
    const dropped = new Promise((resolve) => flooder.once("disconnect", () => resolve(true)))
    flooder.emit("room:create", { nickname: "x".repeat(10_000) })

    expect(await dropped).toBe(true)
    expect((await fetch(`${url}/readyz`)).status).toBe(200)
  })

  it("atrás de proxy, o limite por IP não cai com X-Forwarded-For falsificado", async () => {
    const proxied = await startApp(
      loadConfig({
        PORT: "0",
        METRICS_PORT: "0",
        LOG_LEVEL: "silent",
        NODE_ENV: "test",
        TRUST_PROXY: "true",
        CLIENT_IP_HEADER: "CF-Connecting-IP",
        MAX_CONNECTIONS_PER_IP: "1",
      }),
      silentLogger
    )
    const connects = (extraHeaders: Record<string, string>) =>
      new Promise((resolve) => {
        const socket = io(`http://127.0.0.1:${proxied.port}`, {
          transports: ["websocket"],
          forceNew: true,
          reconnection: false,
          extraHeaders,
        })
        opened.push(socket)
        socket.once("connect", () => resolve(true))
        socket.once("connect_error", () => resolve(false))
      })

    const client = "203.0.113.7"
    expect(await connects({ "cf-connecting-ip": client, "x-forwarded-for": "1.1.1.1" })).toBe(true)
    expect(await connects({ "cf-connecting-ip": client, "x-forwarded-for": "2.2.2.2" })).toBe(false)
    expect(await connects({ "cf-connecting-ip": "203.0.113.8" })).toBe(true)

    await proxied.stop()
  })

  it("RF-06 reconecta com o token e recupera a mão", async () => {
    const { guestSocket, guest, hostSocket, guestView } = await startMatch()
    const offline = nextState(
      hostSocket,
      (state) => state.players.find((player) => player.id === guest.playerId)?.connected === false
    )
    guestSocket.disconnect()
    await offline

    const returning = await connect()
    const restored = nextState(returning)
    const seat = await expectData(
      request<SeatDto>(returning, "room:reconnect", {
        code: guest.code,
        nickname: "Beto",
        reconnectToken: guest.reconnectToken,
      })
    )

    expect(seat.playerId).toBe(guest.playerId)
    expect((await restored).game?.hand).toEqual(guestView.game?.hand)
  })

  it("derruba a conexão antiga quando o jogador reconecta em outra aba", async () => {
    const { guestSocket, guest } = await createLobby()
    const closed = new Promise((resolve) => guestSocket.once("disconnect", resolve))
    const second = await connect()
    await expectData(
      request<SeatDto>(second, "room:reconnect", {
        code: guest.code,
        nickname: "Beto",
        reconnectToken: guest.reconnectToken,
      })
    )
    expect(await closed).toBe("io server disconnect")
    expect(guestSocket.connected).toBe(false)
  })

  it("RF-05 avisa o jogador removido", async () => {
    const { hostSocket, guestSocket, guest } = await createLobby()
    const removed = new Promise((resolve) => guestSocket.once("room:removed", resolve))
    await expectData(request(hostSocket, "room:kick", { playerId: guest.playerId }))
    expect(await removed).toEqual({ reason: "kicked" })
    expect(await expectErrorCode(request(guestSocket, "game:start"))).toBe("NOT_IN_ROOM")
  })

  it("RN-20 a saída do penúltimo jogador encerra e dá a vitória a quem ficou", async () => {
    const { hostSocket, guestSocket, host } = await createLobby()
    const started = nextState(hostSocket, (state) => state.status === "playing")
    await expectData(request(hostSocket, "game:start"))
    await started

    const abandoned = nextState(hostSocket, (state) => state.status === "finished")
    await expectData(request(guestSocket, "room:leave"))
    const finished = await abandoned

    expect(finished.game?.winnerIds).toEqual([host.playerId])
    expect(finished.game?.endReason).toBe("abandoned")
  })

  it("RF-15 joga de novo na mesma sala depois de terminar", async () => {
    const { hostSocket, guestSocket, host } = await createLobby()
    const third = await connect()
    const seat = await expectData(
      request<SeatDto>(third, "room:join", { code: host.code, nickname: "Caio" })
    )
    const started = nextState(hostSocket, (state) => state.status === "playing")
    await expectData(request(hostSocket, "game:start"))
    await started

    await expectData(request(third, "room:leave"))
    const abandoned = nextState(hostSocket, (state) => state.status === "finished")
    await expectData(request(guestSocket, "room:leave"))
    await abandoned

    expect(await expectErrorCode(request(hostSocket, "game:start"))).toBe("NOT_ENOUGH_PLAYERS")
    expect(seat.code).toBe(host.code)

    const returning = await connect()
    const rejoined = nextState(hostSocket, (state) => state.players.length === 2)
    await expectData(request<SeatDto>(returning, "room:join", { code: host.code, nickname: "Bia" }))
    expect((await rejoined).canStart).toBe(true)

    const restarted = nextState(returning, (state) => state.status === "playing")
    await expectData(request(hostSocket, "game:start"))
    expect((await restarted).game?.hand).toHaveLength(4)
  })

  it("recusa entrada com a partida em andamento e explica o motivo", async () => {
    const { hostSocket, host } = await createLobby()
    const started = nextState(hostSocket, (state) => state.status === "playing")
    await expectData(request(hostSocket, "game:start"))
    await started

    const late = await connect()
    expect(
      await expectErrorCode(
        request<SeatDto>(late, "room:join", { code: host.code, nickname: "Bia" })
      )
    ).toBe("GAME_ALREADY_STARTED")
  })

  it("RF-05 remove jogador entre uma partida e outra", async () => {
    const { hostSocket, guestSocket, guest } = await createLobby()
    const third = await connect()
    const seat = await expectData(
      request<SeatDto>(third, "room:join", { code: guest.code, nickname: "Caio" })
    )
    const started = nextState(hostSocket, (state) => state.status === "playing")
    await expectData(request(hostSocket, "game:start"))
    await started
    await expectData(request(third, "room:leave"))
    expect(seat.code).toBe(guest.code)

    const finished = nextState(hostSocket, (state) => state.status === "finished")
    await expectData(request(guestSocket, "room:leave"))
    await finished

    const newcomer = await connect()
    const arrived = await expectData(
      request<SeatDto>(newcomer, "room:join", { code: guest.code, nickname: "Bia" })
    )
    const removed = new Promise((resolve) => newcomer.once("room:removed", resolve))
    await expectData(request(hostSocket, "room:kick", { playerId: arrived.playerId }))
    expect(await removed).toEqual({ reason: "kicked" })
  })
})

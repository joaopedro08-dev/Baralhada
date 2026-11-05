import { beforeEach, describe, expect, it } from "vitest"
import type {
  Clock,
  GameSettings,
  IdentityGenerator,
  RoomNotifier,
  TurnScheduler,
} from "../../src/application/ports.js"
import { RoomSession } from "../../src/application/room-session.js"
import { CreateRoom } from "../../src/application/use-cases/create-room.js"
import { DisconnectPlayer } from "../../src/application/use-cases/disconnect-player.js"
import { ExpireTurn } from "../../src/application/use-cases/expire-turn.js"
import { GetHints } from "../../src/application/use-cases/rouba-monte/get-hints.js"
import { JoinRoom } from "../../src/application/use-cases/join-room.js"
import { KickPlayer } from "../../src/application/use-cases/kick-player.js"
import { LeaveRoom } from "../../src/application/use-cases/leave-room.js"
import { PlayTurn } from "../../src/application/use-cases/play-turn.js"
import { ReconnectPlayer } from "../../src/application/use-cases/reconnect-player.js"
import { StartMatch } from "../../src/application/use-cases/start-match.js"
import { SweepRooms } from "../../src/application/use-cases/sweep-rooms.js"
import type { Card } from "../../src/domain/cards/card.js"
import type { Game } from "../../src/domain/games/rouba-monte/model.js"
import { roubaMonteRules } from "../../src/domain/games/rouba-monte/rules.js"
import type { Result } from "../../src/domain/shared/result.js"
import { InMemoryRoomRepository } from "../../src/infrastructure/in-memory-room-repository.js"
import { seededRandom } from "../support/game-builder.js"

const settings: GameSettings = {
  turnDurationMs: 60_000,
  matchCountdownMs: 0,
  reconnectGraceMs: 120_000,
  emptyRoomTtlMs: 150_000,
  maxRooms: 2,
}

const unwrap = <T>(result: Result<T, string>): T => {
  if (!result.ok) throw new Error(result.error)
  return result.value
}

const setup = (custom: Partial<GameSettings> = {}) => {
  const rooms = new InMemoryRoomRepository<Game>()
  const clock = {
    current: 1000,
    now() {
      return this.current
    },
  } satisfies Clock & { current: number }
  const published: number[] = []
  const removed: string[] = []
  const notifier: RoomNotifier<Game> = {
    publish: (room) => published.push(room.version),
    notifyRemoved: (playerId) => removed.push(playerId),
  }
  const timers = new Map<string, { turnNumber: number; delayMs: number }>()
  const scheduler: TurnScheduler = {
    schedule: (code, turnNumber, delayMs) => timers.set(code, { turnNumber, delayMs }),
    cancel: (code) => timers.delete(code),
  }
  let sequence = 0
  const identities: IdentityGenerator = {
    roomCode: () => `ROOM${++sequence}`,
    playerId: () => `player-${++sequence}`,
    reconnectToken: () => `token-${++sequence}`,
  }
  const random = seededRandom(42)
  const session = new RoomSession(
    roubaMonteRules,
    { rooms, notifier, scheduler, clock, random },
    { ...settings, ...custom }
  )
  return {
    rooms,
    clock,
    published,
    removed,
    timers,
    create: new CreateRoom(rooms, identities, session, settings),
    join: new JoinRoom(identities, session),
    reconnect: new ReconnectPlayer(session, clock),
    leave: new LeaveRoom(session),
    kick: new KickPlayer(session, notifier),
    disconnect: new DisconnectPlayer(session, clock),
    start: new StartMatch(session, random),
    play: new PlayTurn(session, random),
    expire: new ExpireTurn(session, random),
    sweep: new SweepRooms(rooms, session, clock, settings),
    hints: new GetHints(session),
  }
}

type Setup = ReturnType<typeof setup>

const lobby = (app: Setup) => {
  const host = unwrap(app.create.execute({ nickname: "Ana" }))
  const guest = unwrap(app.join.execute({ code: host.roomCode, nickname: "Beto" }))
  const actorOf = (grant: typeof host) => ({ roomCode: grant.roomCode, playerId: grant.playerId })
  return { host, guest, hostActor: actorOf(host), guestActor: actorOf(guest) }
}

describe("casos de uso", () => {
  let app: Setup

  beforeEach(() => {
    app = setup()
  })

  describe("RF-01 criar sala", () => {
    it("guarda a sala e publica o estado", () => {
      const grant = unwrap(app.create.execute({ nickname: "Ana" }))
      expect(app.rooms.find(grant.roomCode)?.players[0]?.nickname).toBe("Ana")
      expect(app.published).toEqual([1])
    })

    it("recusa quando o limite de salas foi atingido", () => {
      app.create.execute({ nickname: "A" })
      app.create.execute({ nickname: "B" })
      expect(app.create.execute({ nickname: "C" })).toEqual({ ok: false, error: "SERVER_FULL" })
    })
  })

  describe("RF-02 entrar", () => {
    it("recusa código inexistente", () => {
      expect(app.join.execute({ code: "NOPE22", nickname: "Ana" })).toEqual({
        ok: false,
        error: "ROOM_NOT_FOUND",
      })
    })
  })

  describe("RF-04 e RF-07 iniciar", () => {
    it("só o anfitrião inicia e as cartas são distribuídas", () => {
      const { hostActor, guestActor, host } = lobby(app)
      expect(app.start.execute(guestActor)).toEqual({ ok: false, error: "NOT_HOST" })

      unwrap(app.start.execute(hostActor))
      const room = app.rooms.find(host.roomCode)

      expect(room?.game?.table).toHaveLength(10)
      expect(room?.turnDeadlineAt).toBe(61_000)
      expect(app.timers.get(host.roomCode)).toEqual({ turnNumber: 1, delayMs: 60_000 })
    })

    it("não inicia sozinho nem duas vezes", () => {
      const solo = unwrap(app.create.execute({ nickname: "Ana" }))
      expect(app.start.execute({ roomCode: solo.roomCode, playerId: solo.playerId })).toEqual({
        ok: false,
        error: "NOT_ENOUGH_PLAYERS",
      })

      const { hostActor } = lobby(app)
      unwrap(app.start.execute(hostActor))
      expect(app.start.execute(hostActor)).toEqual({ ok: false, error: "GAME_ALREADY_STARTED" })
    })
  })

  describe("RF-05 remover jogador", () => {
    it("o anfitrião remove antes do início e o removido é avisado", () => {
      const { hostActor, guest, host } = lobby(app)
      unwrap(app.kick.execute(hostActor, guest.playerId))
      expect(app.removed).toEqual([guest.playerId])
      expect(app.rooms.find(host.roomCode)?.players).toHaveLength(1)
    })

    it("aplica as restrições", () => {
      const { hostActor, guestActor, host, guest } = lobby(app)
      expect(app.kick.execute(guestActor, host.playerId)).toEqual({ ok: false, error: "NOT_HOST" })
      expect(app.kick.execute(hostActor, host.playerId)).toEqual({
        ok: false,
        error: "CANNOT_KICK_SELF",
      })
      expect(app.kick.execute(hostActor, "ninguem")).toEqual({
        ok: false,
        error: "PLAYER_NOT_IN_ROOM",
      })
      unwrap(app.start.execute(hostActor))
      expect(app.kick.execute(hostActor, guest.playerId)).toEqual({
        ok: false,
        error: "GAME_ALREADY_STARTED",
      })
    })
  })

  describe("RF-06 reconexão", () => {
    it("recupera o lugar com apelido e token", () => {
      const { guest, guestActor, host } = lobby(app)
      app.disconnect.execute(guestActor)
      const back = unwrap(
        app.reconnect.execute({
          code: host.roomCode,
          nickname: "Beto",
          reconnectToken: guest.reconnectToken,
        })
      )
      expect(back.playerId).toBe(guest.playerId)
      expect(app.rooms.find(host.roomCode)?.players[1]?.connected).toBe(true)
    })

    it("recusa quem tenta entrar com o apelido de outro jogador", () => {
      const { host } = lobby(app)
      expect(
        app.reconnect.execute({ code: host.roomCode, nickname: "Beto", reconnectToken: "chute" })
      ).toEqual({ ok: false, error: "INVALID_RECONNECT" })
    })

    it("recusa depois de 2 minutos", () => {
      const { guest, guestActor, host } = lobby(app)
      app.disconnect.execute(guestActor)
      app.clock.current += settings.reconnectGraceMs
      app.sweep.execute()
      expect(
        app.reconnect.execute({
          code: host.roomCode,
          nickname: "Beto",
          reconnectToken: guest.reconnectToken,
        })
      ).toEqual({ ok: false, error: "INVALID_RECONNECT" })
    })

    it("recusa sala inexistente", () => {
      expect(app.reconnect.execute({ code: "NOPE22", nickname: "A", reconnectToken: "t" })).toEqual(
        { ok: false, error: "ROOM_NOT_FOUND" }
      )
    })
  })

  describe("RF-09 e RF-10 jogadas", () => {
    it("aplica a ação, publica e mantém o cronômetro do mesmo turno", () => {
      const { hostActor, guestActor, host } = lobby(app)
      unwrap(app.start.execute(hostActor))
      const loadRoom = () => app.rooms.find(host.roomCode)
      const actor = loadRoom()?.game?.turn.playerId === hostActor.playerId ? hostActor : guestActor
      const deadline = loadRoom()?.turnDeadlineAt

      app.clock.current += 5000
      unwrap(app.play.perform(actor, { type: "draw" }))
      expect(loadRoom()?.turnDeadlineAt).toBe(deadline)

      const players = loadRoom()?.game?.players ?? []
      const card = players.find((player) => player.id === actor.playerId)?.hand[0] as Card
      unwrap(app.play.perform(actor, { type: "discard", card }))

      expect(loadRoom()?.game?.turn.number).toBe(2)
      expect(loadRoom()?.turnDeadlineAt).toBe(app.clock.current + settings.turnDurationMs)
    })

    it("recusa jogar antes de iniciar", () => {
      const { hostActor } = lobby(app)
      expect(app.play.perform(hostActor, { type: "draw" })).toEqual({
        ok: false,
        error: "GAME_NOT_RUNNING",
      })
    })

    it("recusa quem não está na sala", () => {
      const { host } = lobby(app)
      expect(
        app.play.perform({ roomCode: host.roomCode, playerId: "intruso" }, { type: "draw" })
      ).toEqual({ ok: false, error: "PLAYER_NOT_IN_ROOM" })
    })
  })

  describe("RF-23 tempo de turno", () => {
    it("encerra o turno certo e ignora timer antigo", () => {
      const { hostActor, host } = lobby(app)
      unwrap(app.start.execute(hostActor))

      app.expire.execute({ roomCode: host.roomCode, turnNumber: 99 })
      expect(app.rooms.find(host.roomCode)?.game?.turn.number).toBe(1)

      app.expire.execute({ roomCode: host.roomCode, turnNumber: 1 })
      expect(app.rooms.find(host.roomCode)?.game?.turn.number).toBe(2)
      expect(app.timers.get(host.roomCode)?.turnNumber).toBe(2)
    })

    it("ignora sala que não existe mais ou sem partida", () => {
      const { host } = lobby(app)
      expect(() => app.expire.execute({ roomCode: "NOPE", turnNumber: 1 })).not.toThrow()
      expect(() => app.expire.execute({ roomCode: host.roomCode, turnNumber: 1 })).not.toThrow()
    })
  })

  describe("contagem regressiva", () => {
    const COUNTDOWN_MS = 3000

    it("recusa jogadas e segura o relógio do turno até o fim da contagem", () => {
      const counting = setup({ matchCountdownMs: COUNTDOWN_MS })
      const { host, hostActor, guestActor } = lobby(counting)
      unwrap(counting.start.execute(hostActor))

      const room = counting.rooms.find(host.roomCode)
      expect(room?.matchStartsAt).toBe(counting.clock.current + COUNTDOWN_MS)
      expect(room?.turnDeadlineAt).toBe(counting.clock.current + COUNTDOWN_MS + 60_000)
      expect(counting.timers.get(host.roomCode)?.delayMs).toBe(COUNTDOWN_MS + 60_000)

      const currentActor = room?.game?.turn.playerId === host.playerId ? hostActor : guestActor
      expect(counting.play.finish(currentActor)).toEqual({ ok: false, error: "MATCH_STARTING" })

      counting.clock.current += COUNTDOWN_MS
      expect(counting.play.finish(currentActor).ok).toBe(true)
      const next = counting.rooms.find(host.roomCode)
      expect(next?.turnDeadlineAt).toBe(counting.clock.current + 60_000)
    })
  })

  describe("RF-15 jogar de novo", () => {
    it("reinicia com o próximo à direita e novo cronômetro", () => {
      const { hostActor, host } = lobby(app)
      unwrap(app.start.execute(hostActor))
      const room = app.rooms.find(host.roomCode)
      if (!room?.game) throw new Error("partida não iniciada")
      const firstStarter = room.lastStarterId
      app.rooms.save({
        ...room,
        game: { ...room.game, endReason: "allQuadsComplete", winnerIds: [hostActor.playerId] },
      })

      unwrap(app.start.execute(hostActor))
      const restarted = app.rooms.find(host.roomCode)
      const expectedStarter = room.players.find((player) => player.id !== firstStarter)?.id

      expect(restarted?.lastStarterId).toBe(expectedStarter)
      expect(restarted?.game?.turn.playerId).toBe(expectedStarter)
      expect(restarted?.game?.turn.number).toBe(1)
      expect(app.timers.get(host.roomCode)?.turnNumber).toBe(1)
    })

    it("cancela o cronômetro quando a partida acaba por abandono", () => {
      const { hostActor, host } = lobby(app)
      unwrap(app.start.execute(hostActor))
      unwrap(app.leave.execute(hostActor))
      expect(app.rooms.find(host.roomCode)?.game?.endReason).toBe("abandoned")
      expect(app.timers.has(host.roomCode)).toBe(false)
    })
  })

  describe("RNF-07 limpeza", () => {
    it("libera a vaga na hora quando o último jogador sai", () => {
      const first = unwrap(app.create.execute({ nickname: "A" }))
      unwrap(app.create.execute({ nickname: "B" }))
      expect(app.create.execute({ nickname: "C" })).toEqual({ ok: false, error: "SERVER_FULL" })

      unwrap(app.leave.execute({ roomCode: first.roomCode, playerId: first.playerId }))

      expect(app.rooms.find(first.roomCode)).toBeUndefined()
      expect(app.create.execute({ nickname: "C" }).ok).toBe(true)
    })

    it("mantém a sala enquanto restar alguém nela", () => {
      const { hostActor, host } = lobby(app)
      unwrap(app.leave.execute(hostActor))
      expect(app.rooms.find(host.roomCode)?.players).toHaveLength(1)
    })

    it("apaga a sala e cancela o cronômetro quando todos saem da partida", () => {
      const { hostActor, guestActor, host } = lobby(app)
      unwrap(app.start.execute(hostActor))
      unwrap(app.leave.execute(hostActor))
      unwrap(app.leave.execute(guestActor))
      expect(app.rooms.find(host.roomCode)).toBeUndefined()
      expect(app.timers.has(host.roomCode)).toBe(false)
    })

    it("deixa reconectar até o fim do prazo mesmo com a sala vazia", () => {
      const { hostActor, guestActor, host } = lobby(app)
      app.disconnect.execute(hostActor)
      app.disconnect.execute(guestActor)

      app.clock.current += settings.reconnectGraceMs - 1
      app.sweep.execute()

      const back = app.reconnect.execute({
        code: host.roomCode,
        nickname: "Ana",
        reconnectToken: host.reconnectToken,
      })
      expect(back.ok).toBe(true)
    })

    it("apaga a sala depois do prazo sem ninguém conectado", () => {
      const { hostActor, guestActor, host } = lobby(app)
      app.disconnect.execute(hostActor)
      app.disconnect.execute(guestActor)

      app.clock.current += settings.emptyRoomTtlMs - 1
      app.sweep.execute()
      expect(app.rooms.find(host.roomCode)).toBeDefined()

      app.clock.current += 1
      app.sweep.execute()
      expect(app.rooms.find(host.roomCode)).toBeUndefined()
    })

    it("não apaga sala com alguém conectado", () => {
      const { guestActor, host } = lobby(app)
      app.disconnect.execute(guestActor)
      app.clock.current += settings.emptyRoomTtlMs
      app.sweep.execute()
      expect(app.rooms.find(host.roomCode)?.players).toHaveLength(1)
    })

    it("aplica a RN-20 a quem não voltou na partida", () => {
      const { hostActor, guestActor, host } = lobby(app)
      unwrap(app.start.execute(hostActor))
      app.disconnect.execute(guestActor)
      app.clock.current += settings.reconnectGraceMs
      app.sweep.execute()
      expect(app.rooms.find(host.roomCode)?.game?.endReason).toBe("abandoned")
    })
  })

  describe("RF-17 e RF-20 dicas", () => {
    it("usa só a visão do próprio jogador", () => {
      const { hostActor, guestActor, host } = lobby(app)
      unwrap(app.start.execute(hostActor))
      const game = app.rooms.find(host.roomCode)?.game
      const actor = game?.turn.playerId === hostActor.playerId ? hostActor : guestActor
      const other = actor === hostActor ? guestActor : hostActor

      const { hints } = unwrap(app.hints.execute(actor))
      const othersHand = game?.players.find((p) => p.id === other.playerId)?.hand ?? []

      expect(hints.plays.length).toBeGreaterThan(0)
      for (const card of othersHand) expect(hints.highlights.handCards).not.toContain(card)
    })
  })
})

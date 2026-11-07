import { describe, expect, it } from "vitest"
import type { RoomNotifier, TurnScheduler } from "../../src/application/ports.js"
import type { Actor } from "../../src/application/room-session.js"
import { ChooseGame } from "../../src/application/use-cases/choose-game.js"
import { RoomSession } from "../../src/application/room-session.js"
import { CreateRoom } from "../../src/application/use-cases/create-room.js"
import { ExpireTurn } from "../../src/application/use-cases/expire-turn.js"
import { JoinRoom } from "../../src/application/use-cases/join-room.js"
import { LeaveRoom } from "../../src/application/use-cases/leave-room.js"
import { PlayTurn } from "../../src/application/use-cases/play-turn.js"
import { StartMatch } from "../../src/application/use-cases/start-match.js"
import { roubaMonteRules } from "../../src/domain/games/rouba-monte/rules.js"
import { createGameCatalog } from "../../src/domain/room/game-catalog.js"
import type { GameRules } from "../../src/domain/room/game-rules.js"
import { err, ok } from "../../src/domain/shared/result.js"
import type { Result } from "../../src/domain/shared/result.js"
import type { PlayerId } from "../../src/domain/shared/seat.js"
import { InMemoryRoomRepository } from "../../src/infrastructure/in-memory-room-repository.js"
import { seededRandom } from "../support/game-builder.js"

interface RaceState {
  readonly order: readonly PlayerId[]
  readonly turnNumber: number
  readonly current: PlayerId
  readonly total: number
  readonly winnerId: PlayerId | null
}

type RaceStep = { readonly add: 0 | 1 | 2 }
type RaceError = "NOT_YOUR_TURN" | "GAME_OVER"

const TARGET = 5

const nextOf = (state: RaceState): PlayerId => {
  const index = state.order.indexOf(state.current)
  return state.order[(index + 1) % state.order.length] as PlayerId
}

const advance = (state: RaceState, total: number): RaceState => ({
  ...state,
  total,
  turnNumber: state.turnNumber + 1,
  current: nextOf(state),
  winnerId: total >= TARGET ? state.current : null,
})

const raceRules: GameRules<RaceState, RaceStep, RaceError> = {
  id: "corrida-ate-5",
  playerCounts: [2, 3],
  teamCount: null,
  turnDurationMs: 30_000,
  start: (seats, starterId) =>
    ok({
      order: seats.map((seat) => seat.id),
      turnNumber: 1,
      current: starterId,
      total: 0,
      winnerId: null,
    }),
  play: (state, playerId, step): Result<RaceState, RaceError> => {
    if (state.winnerId) return err("GAME_OVER")
    if (state.current !== playerId) return err("NOT_YOUR_TURN")
    return ok(advance(state, state.total + step.add))
  },
  expireTurn: (state) => advance(state, state.total),
  removePlayer: (state, playerId) => ({
    ...state,
    order: state.order.filter((id) => id !== playerId),
    winnerId: state.order.length <= 2 ? (state.order.find((id) => id !== playerId) ?? null) : null,
  }),
  turnOf: (state) => ({ number: state.turnNumber, playerId: state.current }),
  isFinished: (state) => state.winnerId !== null,
}

const PAUSE_MS = 1500

const pacedRules: GameRules<RaceState, RaceStep, RaceError> = {
  ...raceRules,
  id: "corrida-com-pausa",
  pauseAfter: (previous, next) => (next.total > previous.total ? PAUSE_MS : 0),
  playsDuringPause: (step) => step.add === 0,
}

const AUTOMATIC_TOTAL = 2

const steppedRules: GameRules<RaceState, RaceStep, RaceError> = {
  ...pacedRules,
  id: "corrida-com-passo-automatico",
  turnOf: (state) => ({
    number: state.turnNumber,
    playerId: state.current,
    automatic: state.total === AUTOMATIC_TOTAL,
  }),
}

const setup = () => {
  const rooms = new InMemoryRoomRepository<RaceState>()
  const notifier: RoomNotifier = {
    publish: () => undefined,
    notifyRemoved: () => undefined,
  }
  const timers = new Map<string, number>()
  const delays = new Map<string, number>()
  const scheduler: TurnScheduler = {
    schedule: (code, turnNumber, delay) => {
      timers.set(code, turnNumber)
      delays.set(code, delay)
    },
    cancel: (code) => timers.delete(code),
  }
  let now = 0
  let sequence = 0
  const identities = {
    roomCode: () => `SALA${++sequence}`,
    playerId: () => `p${++sequence}`,
    reconnectToken: () => `t${++sequence}`,
  }
  const random = seededRandom(3)
  const settings = {
    turnDurationOverrideMs: null,
    pauseOverrideMs: null,
    matchCountdownMs: 0,
    reconnectGraceMs: 60_000,
    emptyRoomTtlMs: 60_000,
    maxRooms: 5,
  }
  const session = new RoomSession(
    createGameCatalog([raceRules, pacedRules, steppedRules, roubaMonteRules]),
    { rooms, notifier, scheduler, clock: { now: () => now }, random },
    settings
  )
  const playTurn = new PlayTurn(session, random)
  return {
    rooms,
    timers,
    delays,
    tick: (ms: number) => {
      now += ms
    },
    create: new CreateRoom(rooms, identities, session, settings),
    join: new JoinRoom(identities, session),
    leave: new LeaveRoom(session),
    start: new StartMatch(session, random),
    choose: new ChooseGame(session),
    play: {
      perform: (actor: Actor, step: RaceStep) => playTurn.perform(actor, () => ok(step)),
    },
    expire: new ExpireTurn(session, random),
  }
}

const unwrap = <T>(result: Result<T, string>): T => {
  if (!result.ok) throw new Error(result.error)
  return result.value
}

describe("a plataforma recebe outro jogo sem mudar sala nem casos de uso", () => {
  it("cria sala, inicia, joga, expira o turno e termina com outro conjunto de regras", () => {
    const t = setup()
    const host = unwrap(t.create.execute({ nickname: "Ana" }))
    const guest = unwrap(t.join.execute({ code: host.roomCode, nickname: "Beto" }))
    unwrap(t.start.execute({ roomCode: host.roomCode, playerId: host.playerId }))

    const actorOf = (playerId: PlayerId) => ({ roomCode: host.roomCode, playerId })
    const stateOf = () => t.rooms.find(host.roomCode)?.game as RaceState
    expect(t.timers.get(host.roomCode)).toBe(1)

    const first = stateOf().current
    const second = first === host.playerId ? guest.playerId : host.playerId
    expect(t.play.perform(actorOf(second), { add: 2 })).toEqual({
      ok: false,
      error: "NOT_YOUR_TURN",
    })

    unwrap(t.play.perform(actorOf(first), { add: 2 }))
    t.expire.execute({ roomCode: host.roomCode, turnNumber: 2 })
    expect(stateOf().current).toBe(first)
    expect(t.timers.get(host.roomCode)).toBe(3)

    unwrap(t.play.perform(actorOf(first), { add: 2 }))
    unwrap(t.play.perform(actorOf(second), { add: 0 }))
    unwrap(t.play.perform(actorOf(first), { add: 1 }))

    expect(stateOf().winnerId).toBe(first)
    expect(t.timers.has(host.roomCode)).toBe(false)
    expect(t.play.perform(actorOf(second), { add: 1 })).toEqual({
      ok: false,
      error: "GAME_NOT_RUNNING",
    })
  })

  it("usa o limite de jogadores do jogo", () => {
    const t = setup()
    const host = unwrap(t.create.execute({ nickname: "Ana" }))
    unwrap(t.join.execute({ code: host.roomCode, nickname: "Beto" }))
    unwrap(t.join.execute({ code: host.roomCode, nickname: "Caio" }))
    expect(t.join.execute({ code: host.roomCode, nickname: "Duda" })).toEqual({
      ok: false,
      error: "ROOM_FULL",
    })
  })

  it("delega a saída no meio da partida às regras do jogo", () => {
    const t = setup()
    const host = unwrap(t.create.execute({ nickname: "Ana" }))
    const guest = unwrap(t.join.execute({ code: host.roomCode, nickname: "Beto" }))
    unwrap(t.start.execute({ roomCode: host.roomCode, playerId: host.playerId }))
    unwrap(t.leave.execute({ roomCode: host.roomCode, playerId: guest.playerId }))
    expect(t.rooms.find(host.roomCode)?.game?.winnerId).toBe(host.playerId)
  })

  it("roda dois jogos ao mesmo tempo, cada sala com o seu", () => {
    const t = setup()
    const race = unwrap(t.create.execute({ nickname: "Ana" }))
    const monte = unwrap(t.create.execute({ nickname: "Caio", gameId: roubaMonteRules.id }))
    unwrap(t.join.execute({ code: race.roomCode, nickname: "Beto" }))
    unwrap(t.join.execute({ code: monte.roomCode, nickname: "Duda" }))
    unwrap(t.start.execute({ roomCode: race.roomCode, playerId: race.playerId }))
    unwrap(t.start.execute({ roomCode: monte.roomCode, playerId: monte.playerId }))

    expect(t.rooms.find(race.roomCode)?.gameId).toBe("corrida-ate-5")
    expect(t.rooms.find(monte.roomCode)?.gameId).toBe("rouba-monte")
    expect(
      (t.rooms.find(monte.roomCode)?.game as unknown as { table: unknown[] }).table
    ).toHaveLength(8)
  })

  it("RF-25 só o anfitrião troca o jogo, antes de iniciar, e recusa jogo desconhecido", () => {
    const t = setup()
    const host = unwrap(t.create.execute({ nickname: "Ana" }))
    const guest = unwrap(t.join.execute({ code: host.roomCode, nickname: "Beto" }))
    const hostActor = { roomCode: host.roomCode, playerId: host.playerId }

    expect(
      t.choose.execute({ roomCode: host.roomCode, playerId: guest.playerId }, "rouba-monte")
    ).toEqual({
      ok: false,
      error: "NOT_HOST",
    })
    expect(t.choose.execute(hostActor, "xadrez")).toEqual({ ok: false, error: "UNKNOWN_GAME" })
    unwrap(t.choose.execute(hostActor, "rouba-monte"))
    expect(t.rooms.find(host.roomCode)?.gameId).toBe("rouba-monte")

    unwrap(t.start.execute(hostActor))
    expect(t.choose.execute(hostActor, "corrida-ate-5")).toEqual({
      ok: false,
      error: "GAME_ALREADY_STARTED",
    })
  })

  it("recusa criar sala de jogo desconhecido", () => {
    const t = setup()
    expect(t.create.execute({ nickname: "Ana", gameId: "xadrez" })).toEqual({
      ok: false,
      error: "UNKNOWN_GAME",
    })
  })
})

describe("pausa da mesa entre jogadas", () => {
  it("segura a próxima jogada até a pausa acabar e só então conta o tempo do turno", () => {
    const t = setup()
    const host = unwrap(t.create.execute({ nickname: "Ana", gameId: "corrida-com-pausa" }))
    const guest = unwrap(t.join.execute({ code: host.roomCode, nickname: "Beto" }))
    unwrap(t.start.execute({ roomCode: host.roomCode, playerId: host.playerId }))
    const actorOf = (playerId: PlayerId) => ({ roomCode: host.roomCode, playerId })
    const room = () => t.rooms.find(host.roomCode)
    const first = (room()?.game as RaceState).current
    const second = first === host.playerId ? guest.playerId : host.playerId

    unwrap(t.play.perform(actorOf(first), { add: 0 }))
    expect(room()?.pausedUntil).toBeNull()

    unwrap(t.play.perform(actorOf(second), { add: 2 }))
    expect(room()?.pausedUntil).toBe(PAUSE_MS)
    expect(t.delays.get(host.roomCode)).toBe(PAUSE_MS + 30_000)
    expect(room()?.turnDeadlineAt).toBe(PAUSE_MS + 30_000)
    expect(t.play.perform(actorOf(first), { add: 1 })).toEqual({
      ok: false,
      error: "TABLE_PAUSED",
    })
    expect(t.play.perform(actorOf(first), { add: 0 }).ok).toBe(true)

    t.tick(PAUSE_MS)
    expect(t.play.perform(actorOf(second), { add: 1 }).ok).toBe(true)
  })
})

describe("passo automático do jogo", () => {
  it("dispara assim que a pausa acaba, sem contar o tempo do turno nem mostrar relógio", () => {
    const t = setup()
    const host = unwrap(
      t.create.execute({ nickname: "Ana", gameId: "corrida-com-passo-automatico" })
    )
    unwrap(t.join.execute({ code: host.roomCode, nickname: "Beto" }))
    unwrap(t.start.execute({ roomCode: host.roomCode, playerId: host.playerId }))
    const room = () => t.rooms.find(host.roomCode)
    const first = (room()?.game as RaceState).current

    unwrap(t.play.perform({ roomCode: host.roomCode, playerId: first }, { add: 2 }))
    expect(t.delays.get(host.roomCode)).toBe(PAUSE_MS)
    expect(room()?.turnDeadlineAt).toBeNull()
  })
})

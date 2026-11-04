import { describe, expect, it } from "vitest"
import type { RoomNotifier, TurnScheduler } from "../../src/application/ports.js"
import { RoomSession } from "../../src/application/room-session.js"
import { CreateRoom } from "../../src/application/use-cases/create-room.js"
import { ExpireTurn } from "../../src/application/use-cases/expire-turn.js"
import { JoinRoom } from "../../src/application/use-cases/join-room.js"
import { LeaveRoom } from "../../src/application/use-cases/leave-room.js"
import { PlayTurn } from "../../src/application/use-cases/play-turn.js"
import { StartMatch } from "../../src/application/use-cases/start-match.js"
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

type RaceStep = { readonly add: 1 | 2 }
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
  minPlayers: 2,
  maxPlayers: 3,
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
  pass: (state, playerId) =>
    state.current === playerId ? ok(advance(state, state.total)) : err("NOT_YOUR_TURN"),
  expireTurn: (state) => advance(state, state.total),
  removePlayer: (state, playerId) => ({
    ...state,
    order: state.order.filter((id) => id !== playerId),
    winnerId: state.order.length <= 2 ? (state.order.find((id) => id !== playerId) ?? null) : null,
  }),
  turnOf: (state) => ({ number: state.turnNumber, playerId: state.current }),
  isFinished: (state) => state.winnerId !== null,
}

const setup = () => {
  const rooms = new InMemoryRoomRepository<RaceState>()
  const notifier: RoomNotifier<RaceState> = {
    publish: () => undefined,
    notifyRemoved: () => undefined,
  }
  const timers = new Map<string, number>()
  const scheduler: TurnScheduler = {
    schedule: (code, turnNumber) => timers.set(code, turnNumber),
    cancel: (code) => timers.delete(code),
  }
  let sequence = 0
  const identities = {
    roomCode: () => `SALA${++sequence}`,
    playerId: () => `p${++sequence}`,
    reconnectToken: () => `t${++sequence}`,
  }
  const random = seededRandom(3)
  const settings = {
    turnDurationMs: 30_000,
    matchCountdownMs: 0,
    reconnectGraceMs: 60_000,
    emptyRoomTtlMs: 60_000,
    maxRooms: 5,
  }
  const session = new RoomSession(
    raceRules,
    { rooms, notifier, scheduler, clock: { now: () => 0 }, random },
    settings
  )
  return {
    rooms,
    timers,
    create: new CreateRoom(rooms, identities, session, settings),
    join: new JoinRoom(identities, session),
    leave: new LeaveRoom(session),
    start: new StartMatch(session, random),
    play: new PlayTurn(session, random),
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
    unwrap(t.play.finish(actorOf(second)))
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
})

import { describe, expect, it } from "vitest"
import { RandomGame } from "../../src/application/use-cases/random-game.js"
import { RoomSession } from "../../src/application/room-session.js"
import type { GameSettings } from "../../src/application/ports.js"
import type { SessionPorts } from "../../src/application/room-session.js"
import { createGameCatalog } from "../../src/domain/room/game-catalog.js"
import type { GameRules } from "../../src/domain/room/game-rules.js"
import { createRoom, addPlayer } from "../../src/domain/room/room.js"
import { ok } from "../../src/domain/shared/result.js"
import { seededRandom } from "../support/game-builder.js"
import type { Room } from "../../src/domain/room/room.js"

const settings: GameSettings = {
  turnDurationOverrideMs: null,
  pauseOverrideMs: null,
  matchCountdownMs: 0,
  reconnectGraceMs: 120_000,
  emptyRoomTtlMs: 150_000,
  maxRooms: 10,
}

const rulesOf = (id: string, playerCounts: readonly number[]): GameRules<null, null, never> => ({
  id,
  playerCounts,
  teamCount: null,
  turnDurationMs: 30_000,
  start: () => ok(null),
  play: () => ok(null),
  expireTurn: () => null,
  removePlayer: () => null,
  turnOf: () => ({ number: 1, playerId: "p0" }),
  isFinished: () => false,
})

const ports = (
  random = seededRandom(1),
  room: Room<unknown> | undefined = undefined
): SessionPorts => ({
  rooms: {
    find: () => room,
    save: () => undefined,
    remove: () => undefined,
    all: () => [],
    count: () => 0,
  },
  notifier: { publish: () => undefined, notifyRemoved: () => undefined },
  scheduler: { schedule: () => undefined, cancel: () => undefined },
  clock: { now: () => 0 },
  random,
})

describe("sorteio de jogo", () => {
  it("escolhe somente jogos compatíveis com o número de jogadores", () => {
    const compatible = rulesOf("compatible", [2])
    const incompatible = rulesOf("incompatible", [3])
    const session = new RoomSession(
      createGameCatalog([compatible, incompatible]),
      ports(),
      settings
    )
    const room = createRoom("ROOM22", compatible.id, {
      id: "p0",
      nickname: "Ana",
      reconnectToken: "token",
      connected: true,
      disconnectedAt: null,
    })
    const joined = addPlayer(room, {
      id: "p1",
      nickname: "Beto",
      reconnectToken: "token-2",
      connected: true,
      disconnectedAt: null,
    }, compatible)
    if (!joined.ok) throw new Error(joined.error)
    const result = session.randomGame(joined.value)

    expect(result).toEqual({ ok: true, value: compatible.id })
  })

  it("permite o sorteio somente ao anfitrião", () => {
    const rules = rulesOf("compatible", [2])
    const host = createRoom("ROOM22", rules.id, {
      id: "p0",
      nickname: "Ana",
      reconnectToken: "token",
      connected: true,
      disconnectedAt: null,
    })
    const room = addPlayer(host, {
      id: "p1",
      nickname: "Beto",
      reconnectToken: "token-2",
      connected: true,
      disconnectedAt: null,
    }, rules)
    if (!room.ok) throw new Error(room.error)
    const session = new RoomSession(createGameCatalog([rules]), ports(undefined, room.value), settings)
    const randomGame = new RandomGame(session)

    expect(randomGame.execute({ roomCode: "ROOM22", playerId: "p1" })).toEqual({
      ok: false,
      error: "NOT_HOST",
    })
  })
})

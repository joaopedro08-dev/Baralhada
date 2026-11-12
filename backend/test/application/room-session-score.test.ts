import { describe, expect, it } from "vitest"

import { RoomSession } from "../../src/application/room-session.js"
import type { SessionPorts } from "../../src/application/room-session.js"
import type { GameSettings } from "../../src/application/ports.js"
import { createGameCatalog } from "../../src/domain/room/game-catalog.js"
import type { GameRules } from "../../src/domain/room/game-rules.js"
import { createRoom } from "../../src/domain/room/room.js"
import { ok } from "../../src/domain/shared/result.js"
import { seededRandom } from "../support/game-builder.js"

interface ScoreState {
  readonly finished: boolean
  readonly winners: readonly string[]
}

const rules: GameRules<ScoreState, null, never> = {
  id: "score-test",
  playerCounts: [2],
  teamCount: null,
  turnDurationMs: 30_000,
  start: () => ok({ finished: false, winners: [] }),
  play: (state) => ok(state),
  expireTurn: (state) => state,
  removePlayer: (state) => state,
  winnerIds: (state) => state.winners,
  turnOf: () => ({ number: 1, playerId: "p0" }),
  isFinished: (state) => state.finished,
}

const settings: GameSettings = {
  turnDurationOverrideMs: null,
  pauseOverrideMs: null,
  matchCountdownMs: 0,
  reconnectGraceMs: 120_000,
  emptyRoomTtlMs: 150_000,
  maxRooms: 10,
}

const portsOf = (): SessionPorts => ({
  rooms: {
    find: () => undefined,
    save: () => undefined,
    remove: () => undefined,
    all: () => [],
    count: () => 0,
  },
  notifier: { publish: () => undefined, notifyRemoved: () => undefined },
  scheduler: { schedule: () => undefined, cancel: () => undefined },
  clock: { now: () => 0 },
  random: seededRandom(1),
})

describe("placar acumulado da sala", () => {
  it("soma vencedores uma única vez quando a partida termina", () => {
    const session = new RoomSession(createGameCatalog([rules]), portsOf(), settings)
    const room = createRoom("ROOM22", rules.id, {
      id: "p0",
      nickname: "Ana",
      reconnectToken: "token",
      connected: true,
      disconnectedAt: null,
    })
    const running = { ...room, players: [...room.players, {
      id: "p1",
      nickname: "Beto",
      reconnectToken: "token-2",
      connected: true,
      disconnectedAt: null,
    }], game: { finished: false, winners: [] } }

    const finished = session.advance(running, { finished: true, winners: ["p0"] })
    const repeated = session.advance(finished, { finished: true, winners: ["p0"] })

    expect(finished.matchWins).toEqual({ p0: 1 })
    expect(repeated.matchWins).toEqual({ p0: 1 })
  })
})

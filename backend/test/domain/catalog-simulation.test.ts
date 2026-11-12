import { describe, expect, it } from "vitest"
import { blackjackRules } from "../../src/domain/games/blackjack/rules.js"
import { pokerRules } from "../../src/domain/games/poker/rules.js"
import { roubaMonteRules } from "../../src/domain/games/rouba-monte/rules.js"
import { trucoRules } from "../../src/domain/games/truco/rules.js"
import type { AnyGameRules } from "../../src/domain/room/game-rules.js"
import type { Seat } from "../../src/domain/shared/seat.js"
import { seededRandom, unwrap } from "../support/game-builder.js"
import { SIMULATION_RUNS } from "../support/simulation-config.js"

const GAMES: readonly AnyGameRules[] = [
  roubaMonteRules,
  trucoRules,
  pokerRules,
  blackjackRules,
]

const MAX_STEPS = 12_000
const seatsFor = (game: AnyGameRules): readonly Seat[] => {
  const count = game.playerCounts[0] ?? 2
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    team: game.teamCount === null ? null : index % game.teamCount,
  }))
}

describe("simulação uniforme do catálogo", () => {
  it.each(GAMES.map((game) => [game.id, game] as const))(
    "%s termina em todas as sementes",
    (_id, game) => {
      const seats = seatsFor(game)
      for (let seed = 1; seed <= SIMULATION_RUNS; seed++) {
        const random = seededRandom(seed)
        let state = unwrap(game.start(seats, seats[0]?.id ?? "p0", random))
        let steps = 0
        while (!game.isFinished(state) && steps < MAX_STEPS) {
          state = game.expireTurn(state, random)
          steps += 1
        }
        expect(game.isFinished(state), `${game.id} seed ${seed}`).toBe(true)
        expect(steps).toBeLessThan(MAX_STEPS)
      }
    },
    120_000
  )
})

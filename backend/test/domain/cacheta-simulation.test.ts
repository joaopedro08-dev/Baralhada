import { describe, expect, it } from "vitest"
import type { Card } from "../../src/domain/cards/card.js"
import {
  expireCacheta,
  playCacheta,
  removeCachetaPlayer,
} from "../../src/domain/games/cacheta/actions.js"
import type { CachetaAction } from "../../src/domain/games/cacheta/actions.js"
import { computeCachetaHints } from "../../src/domain/games/cacheta/hints.js"
import { isFinished, playingOf } from "../../src/domain/games/cacheta/model.js"
import type { CachetaGame } from "../../src/domain/games/cacheta/model.js"
import { toCachetaView } from "../../src/domain/games/cacheta/player-view.js"
import { startGame } from "../../src/domain/games/cacheta/setup.js"
import type { RandomSource } from "../../src/domain/shared/random.js"
import { seededRandom, unwrap } from "../support/game-builder.js"
import { allCachetaCards } from "../support/cacheta-builder.js"
import { SIMULATION_RUNS } from "../support/simulation-config.js"

const MAX_STEPS = 6000
const SIMULATION_TIMEOUT_MS = 60_000
const TOTAL_CARDS = 104

const assertInvariants = (game: CachetaGame) => {
  const cards = allCachetaCards(game)
  expect(cards).toHaveLength(TOTAL_CARDS)
  const tally = new Map<Card, number>()
  for (const card of cards) tally.set(card, (tally.get(card) ?? 0) + 1)
  expect([...tally.values()].every((count) => count === 2)).toBe(true)
  expect(game.players.every((player) => player.points >= 0)).toBe(true)
  const gone = game.players.filter((player) => player.status === "left")
  expect(gone.every((player) => player.hand.length === 0)).toBe(true)
  if (isFinished(game) || game.pending !== null) return
  const current = game.players.find((player) => player.id === game.turn.playerId)
  expect(current?.status).toBe("playing")
  expect(current?.hand).toHaveLength(game.turn.stage === "start" ? 9 : 10)
}

const decide = (game: CachetaGame, random: RandomSource): CachetaAction => {
  const view = toCachetaView(game, game.turn.playerId)
  const [best] = computeCachetaHints(view).suggestions
  if (best && random.nextInt(6) > 0) return best.action
  if (view.moves.draw) return { type: "draw" }
  return { type: "discard", card: view.hand[random.nextInt(view.hand.length)] as Card }
}

const playOut = (seed: number) => {
  const random = seededRandom(seed)
  const count = 2 + (seed % 3)
  const seats = Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    team: null,
  }))
  let game = unwrap(startGame(seats, "p0", random))
  let rounds = 1
  for (let step = 0; step < MAX_STEPS && !isFinished(game); step++) {
    if (game.pending !== null || random.nextInt(40) === 0) {
      game = expireCacheta(game, random)
    } else if (seed % 4 === 3 && step === 50) {
      game = removeCachetaPlayer(game, game.turn.playerId, random)
    } else {
      game = unwrap(playCacheta(game, game.turn.playerId, decide(game, random), random))
    }
    rounds = Math.max(rounds, game.round)
    assertInvariants(game)
  }
  return { game, rounds }
}

describe("simulação de partidas de Cacheta", () => {
  it.each(Array.from({ length: SIMULATION_RUNS }, (_, seed) => seed + 1))(
    "a partida %i chega ao fim com um único vencedor",
    (seed) => {
      const { game, rounds } = playOut(seed)
      expect(isFinished(game)).toBe(true)
      expect(game.winnerId).not.toBeNull()
      expect(playingOf(game).map((player) => player.id)).toEqual([game.winnerId])
      if (game.endReason === "knockout") expect(rounds).toBeGreaterThan(1)
      expect(game.eliminations).toHaveLength(game.players.length - 1)
    },
    SIMULATION_TIMEOUT_MS
  )
})

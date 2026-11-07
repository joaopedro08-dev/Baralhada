import { describe, expect, it } from "vitest"
import {
  expireBlackjack,
  playBlackjack,
  removeBlackjackPlayer,
} from "../../src/domain/games/blackjack/actions.js"
import type { BlackjackAction } from "../../src/domain/games/blackjack/actions.js"
import { isFinished, ROUNDS, STARTING_CHIPS } from "../../src/domain/games/blackjack/model.js"
import type { BlackjackGame } from "../../src/domain/games/blackjack/model.js"
import { toBlackjackView } from "../../src/domain/games/blackjack/player-view.js"
import { startGame } from "../../src/domain/games/blackjack/setup.js"
import { computeBlackjackHints } from "../../src/domain/games/blackjack/strategy.js"
import type { RandomSource } from "../../src/domain/shared/random.js"
import { seededRandom, unwrap } from "../support/game-builder.js"
import { cardsInPlay } from "../support/blackjack-builder.js"

const MAX_STEPS = 3000
const SEEDS = 30
const SIMULATION_TIMEOUT_MS = 60_000

const assertInvariants = (game: BlackjackGame) => {
  expect(game.players.every((seat) => seat.chips >= 0)).toBe(true)
  const cards = cardsInPlay(game)
  if (game.phase !== "betting") expect(new Set(cards).size).toBe(cards.length)
  if (game.phase === "playing") {
    const seat = game.players.find((player) => player.id === game.turn.playerId)
    expect(seat?.hands[game.turn.handIndex]?.done).toBe(false)
  }
}

const betFor = (view: ReturnType<typeof toBlackjackView>, random: RandomSource): number => {
  const range = view.moves.bet
  if (!range) return 0
  if (random.nextInt(8) === 0) return range.max
  const steps = Math.floor((Math.min(range.max, 200) - range.min) / range.step)
  return range.min + random.nextInt(steps + 1) * range.step
}

const decide = (game: BlackjackGame, playerId: string, random: RandomSource): BlackjackAction => {
  const view = toBlackjackView(game, playerId)
  if (view.moves.bet) return { type: "bet", amount: betFor(view, random) }
  const advice = computeBlackjackHints(view).advice
  if (advice && random.nextInt(5) > 0) return advice.action
  return random.nextInt(2) === 0 ? { type: "hit" } : { type: "stand" }
}

const actorOf = (game: BlackjackGame): string | null => {
  if (game.phase === "playing") return game.turn.playerId
  if (game.phase !== "betting") return null
  return game.players.find((seat) => seat.status === "playing" && seat.bet === null)?.id ?? null
}

const playOut = (seed: number) => {
  const random = seededRandom(seed)
  const count = 1 + (seed % 6)
  const seats = Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    team: null,
  }))
  let game = unwrap(startGame(seats, "p0", random))
  for (let step = 0; step < MAX_STEPS && !isFinished(game); step++) {
    const actor = actorOf(game)
    if (actor === null || random.nextInt(30) === 0) {
      game = expireBlackjack(game, random)
    } else if (seed % 5 === 4 && step === 40) {
      game = removeBlackjackPlayer(game, actor, random)
    } else {
      game = unwrap(playBlackjack(game, actor, decide(game, actor, random), random))
    }
    assertInvariants(game)
  }
  return game
}

describe("simulação de partidas de Blackjack", () => {
  it.each(Array.from({ length: SEEDS }, (_, seed) => seed + 1))(
    "a partida %i termina em até 10 rodadas com vencedores coerentes",
    (seed) => {
      const game = playOut(seed)
      expect(isFinished(game)).toBe(true)
      expect(game.round).toBeLessThanOrEqual(ROUNDS)
      const best = Math.max(0, ...game.players.map((seat) => seat.chips))
      const expected =
        best === 0 ? [] : game.players.filter((seat) => seat.chips === best).map((seat) => seat.id)
      expect(game.winnerIds).toEqual(expected)
      if (game.endReason === "rounds") expect(game.round).toBe(ROUNDS)
      expect(game.players.every((seat) => seat.chips <= STARTING_CHIPS * 60)).toBe(true)
    },
    SIMULATION_TIMEOUT_MS
  )
})

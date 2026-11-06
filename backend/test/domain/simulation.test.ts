import { describe, expect, it } from "vitest"
import { DECK_SIZE } from "../../src/domain/cards/card.js"
import { computeHints } from "../../src/domain/games/rouba-monte/hints.js"
import { isFinished } from "../../src/domain/games/rouba-monte/model.js"
import type { Game } from "../../src/domain/games/rouba-monte/model.js"
import { countRanksInPiles, toPlayerView } from "../../src/domain/games/rouba-monte/player-view.js"
import { startGame } from "../../src/domain/games/rouba-monte/setup.js"
import { expireTurn, playTurn } from "../../src/domain/games/rouba-monte/turn-flow.js"
import type { RandomSource } from "../../src/domain/shared/random.js"
import { allCardsOf, seededRandom, unwrap } from "../support/game-builder.js"

const MAX_TURNS = 500

const assertDeckIntact = (game: Game) => {
  const cards = allCardsOf(game)
  if (cards.length !== DECK_SIZE || new Set(cards).size !== DECK_SIZE) {
    throw new Error(`Baralho corrompido: ${cards.length} cartas`)
  }
}

const playBestHint = (game: Game): Game => {
  const playerId = game.turn.playerId
  const best = computeHints(toPlayerView(game, playerId), countRanksInPiles(game)).plays[0]
  if (!best) throw new Error(`Sem jogada para ${playerId}`)
  return unwrap(playTurn(game, playerId, best.action))
}

const playGame = (
  playerCount: number,
  seed: number,
  step: (game: Game, random: RandomSource) => Game
) => {
  const random = seededRandom(seed)
  const seats = Array.from({ length: playerCount }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    team: null,
  }))
  let game = unwrap(startGame(seats, "p0", random))
  let turns = 0
  for (; turns < MAX_TURNS && !isFinished(game); turns++) {
    game = step(game, random)
    assertDeckIntact(game)
  }
  return { game, turns }
}

describe("simulação de partidas inteiras", () => {
  it.each([2, 3, 4, 5, 6])("com %i jogadores sempre chega ao fim", (playerCount) => {
    for (let seed = 1; seed <= 20; seed++) {
      const { game } = playGame(playerCount, seed * playerCount, playBestHint)
      const best = Math.max(...game.players.map((player) => player.pile.length))

      expect(["noPlaysLeft", "handsEmpty"]).toContain(game.endReason)
      expect(game.winnerIds.length).toBeGreaterThanOrEqual(1)
      for (const id of game.winnerIds) {
        expect(game.players.find((player) => player.id === id)?.pile).toHaveLength(best)
      }
    }
  })

  it("termina mesmo se todos deixarem o tempo acabar", () => {
    const { game, turns } = playGame(4, 99, expireTurn)
    expect(isFinished(game)).toBe(true)
    expect(turns).toBeLessThanOrEqual(DECK_SIZE)
  })
})

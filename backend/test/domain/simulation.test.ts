import { describe, expect, it } from "vitest"
import { computeHints } from "../../src/domain/games/rouba-monte/hints.js"
import { countCompleteMelds, isFinished } from "../../src/domain/games/rouba-monte/model.js"
import type { Game } from "../../src/domain/games/rouba-monte/model.js"
import { toPlayerView } from "../../src/domain/games/rouba-monte/player-view.js"
import { startGame } from "../../src/domain/games/rouba-monte/setup.js"
import { endTurn, expireTurn, playTurn } from "../../src/domain/games/rouba-monte/turn-flow.js"
import type { RandomSource } from "../../src/domain/shared/random.js"
import { allCardsOf, seededRandom } from "../support/game-builder.js"

const MAX_TURNS = 5000
const AFK_TURNS = 300

const assertInvariants = (game: Game) => {
  const cards = allCardsOf(game)
  if (cards.length !== 52 || new Set(cards).size !== 52) {
    throw new Error(`Baralho corrompido: ${cards.length} cartas`)
  }
  const melds = game.players.flatMap((player) => player.melds)
  if (melds.some((meld) => meld.cards.length < 2 || meld.cards.length > 4)) {
    throw new Error("Quadra com tamanho inválido")
  }
}

const playTurnGreedily = (initial: Game, random: RandomSource): Game => {
  let game = initial
  const playerId = game.turn.playerId
  while (
    !isFinished(game) &&
    game.turn.playerId === playerId &&
    game.turn.number === initial.turn.number
  ) {
    const best = computeHints(toPlayerView(game, playerId)).plays[0]
    if (!best) break
    const played = playTurn(game, playerId, best.action, random)
    if (!played.ok) throw new Error(played.error)
    game = played.value
    assertInvariants(game)
  }
  if (isFinished(game) || game.turn.number !== initial.turn.number) return game
  const ended = endTurn(game, playerId, random)
  if (!ended.ok) throw new Error(ended.error)
  return ended.value
}

const playGame = (
  playerCount: number,
  seed: number,
  step: (game: Game, random: RandomSource) => Game,
  maxTurns: number
) => {
  const random = seededRandom(seed)
  const seats = Array.from({ length: playerCount }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
  }))
  const started = startGame(seats, "p0", random)
  if (!started.ok) throw new Error(started.error)
  let game = started.value
  for (let turn = 0; turn < maxTurns && !isFinished(game); turn++) {
    game = step(game, random)
    assertInvariants(game)
  }
  return game
}

describe("simulação de partidas inteiras", () => {
  it.each([2, 3, 4, 5, 6])("com %i jogadores termina com as 13 quadras", (playerCount) => {
    for (let seed = 1; seed <= 20; seed++) {
      const game = playGame(playerCount, seed * playerCount, playTurnGreedily, MAX_TURNS)
      const quads = game.players.reduce((total, player) => total + countCompleteMelds(player), 0)

      expect(game.endReason).toBe("allQuadsComplete")
      expect(quads).toBe(13)
      expect(game.winnerIds.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("mantém as invariantes mesmo se todos deixarem o tempo acabar", () => {
    const game = playGame(4, 99, expireTurn, AFK_TURNS)
    expect(allCardsOf(game)).toHaveLength(52)
    expect(isFinished(game)).toBe(false)
    expect(game.turn.number).toBe(AFK_TURNS + 1)
  })
})

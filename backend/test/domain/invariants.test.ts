import { describe, expect, it } from "vitest"
import { createFullDeck, DECK_SIZE } from "../../src/domain/cards/card.js"
import type { Card } from "../../src/domain/cards/card.js"
import { computeHints } from "../../src/domain/games/rouba-monte/hints.js"
import { isFinished } from "../../src/domain/games/rouba-monte/model.js"
import type { Game, PlayerId } from "../../src/domain/games/rouba-monte/model.js"
import { countRanksInPiles, toPlayerView } from "../../src/domain/games/rouba-monte/player-view.js"
import { startGame } from "../../src/domain/games/rouba-monte/setup.js"
import type { TurnAction } from "../../src/domain/games/rouba-monte/turn-actions.js"
import { applyTurnAction } from "../../src/domain/games/rouba-monte/turn-actions.js"
import { expireTurn, playTurn, removePlayer } from "../../src/domain/games/rouba-monte/turn-flow.js"
import type { RandomSource } from "../../src/domain/shared/random.js"
import { allCardsOf, seededRandom, unwrap } from "../support/game-builder.js"

const STEPS_PER_GAME = 800
const TIMEOUT_MS = 120_000
const SEEDS = 15
const DECK = createFullDeck()

const pick = <T>(items: readonly T[], random: RandomSource): T =>
  items[random.nextInt(items.length)] as T

const someCards = (random: RandomSource): readonly Card[] =>
  Array.from({ length: random.nextInt(4) }, () => pick(DECK, random))

const randomAction = (game: Game, random: RandomSource): TurnAction => {
  const card = pick(DECK, random)
  const actions: readonly TurnAction[] = [
    { type: "capture", card, tableCards: someCards(random) },
    { type: "stack", card },
    { type: "steal", card, targetId: pick(game.players, random).id },
    { type: "discard", card },
    { type: "draw" },
    { type: "pass" },
  ]
  return pick(actions, random)
}

const assertInvariants = (game: Game) => {
  const cards = allCardsOf(game)
  expect(cards).toHaveLength(DECK_SIZE)
  expect(new Set(cards).size).toBe(DECK_SIZE)
  if (!isFinished(game)) {
    const current = game.players.find((player) => player.id === game.turn.playerId)
    expect(current?.hand.length).toBeGreaterThan(0)
  }
}

const assertHintsAreTruthful = (game: Game) => {
  const playerId = game.turn.playerId
  const { plays } = computeHints(toPlayerView(game, playerId), countRanksInPiles(game))
  for (const { action } of plays) {
    expect(applyTurnAction(game, playerId, action).ok).toBe(true)
  }
  expect(plays.length).toBeGreaterThan(0)
}

const assertRefusalChangesNothing = (game: Game, playerId: PlayerId, action: TurnAction) => {
  const before = structuredClone(game)
  const result = playTurn(game, playerId, action)
  if (!result.ok) expect(game).toEqual(before)
  return result
}

const step = (game: Game, random: RandomSource): Game => {
  const roll = random.nextInt(100)
  const current = game.turn.playerId
  if (roll < 45) {
    const view = toPlayerView(game, current)
    const legal = computeHints(view, countRanksInPiles(game)).plays
    return unwrap(playTurn(game, current, pick(legal, random).action))
  }
  if (roll < 90) {
    const actor = pick(game.players, random).id
    const result = assertRefusalChangesNothing(game, actor, randomAction(game, random))
    return result.ok ? result.value : game
  }
  if (roll < 99) return expireTurn(game, random)
  return removePlayer(game, pick(game.players, random).id, random)
}

const newGame = (players: number, random: RandomSource): Game => {
  const seats = Array.from({ length: players }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
  }))
  return unwrap(startGame(seats, "p0", random))
}

describe("partidas caóticas com jogadas válidas e inválidas", () => {
  it.each([2, 3, 4, 6])(
    "com %i jogadores nada corrompe o jogo",
    (players) => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const random = seededRandom(seed * 1000 + players)
        let game = newGame(players, random)
        for (let index = 0; index < STEPS_PER_GAME && !isFinished(game); index++) {
          assertHintsAreTruthful(game)
          game = step(game, random)
          assertInvariants(game)
        }
        expect(isFinished(game)).toBe(true)
      }
    },
    TIMEOUT_MS
  )
})

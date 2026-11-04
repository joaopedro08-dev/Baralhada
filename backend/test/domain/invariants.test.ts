import { describe, expect, it } from "vitest"
import { createFullDeck, RANKS } from "../../src/domain/cards/card.js"
import type { Card } from "../../src/domain/cards/card.js"
import { computeHints } from "../../src/domain/games/rouba-monte/hints.js"
import { isFinished } from "../../src/domain/games/rouba-monte/model.js"
import type { Game, PlayerId } from "../../src/domain/games/rouba-monte/model.js"
import { toPlayerView } from "../../src/domain/games/rouba-monte/player-view.js"
import { startGame } from "../../src/domain/games/rouba-monte/setup.js"
import type { TurnAction } from "../../src/domain/games/rouba-monte/turn-actions.js"
import { applyTurnAction } from "../../src/domain/games/rouba-monte/turn-actions.js"
import {
  endTurn,
  expireTurn,
  playTurn,
  removePlayer,
} from "../../src/domain/games/rouba-monte/turn-flow.js"
import type { RandomSource } from "../../src/domain/shared/random.js"
import { allCardsOf, seededRandom } from "../support/game-builder.js"

const STEPS_PER_GAME = 800
const TIMEOUT_MS = 120_000
const SEEDS = 15
const DECK = createFullDeck()

const pick = <T>(items: readonly T[], random: RandomSource): T =>
  items[random.nextInt(items.length)] as T

const someCards = (random: RandomSource): readonly Card[] =>
  Array.from({ length: random.nextInt(4) }, () => pick(DECK, random))

const randomAction = (game: Game, random: RandomSource): TurnAction => {
  const actions: readonly TurnAction[] = [
    { type: "draw" },
    { type: "layDown", cards: someCards(random) },
    { type: "takeFromTable", tableCards: someCards(random), handCards: someCards(random) },
    {
      type: "steal",
      targetId: pick(game.players, random).id,
      rank: pick(RANKS, random),
      handCards: someCards(random),
    },
    { type: "discard", card: pick(DECK, random) },
  ]
  return pick(actions, random)
}

const assertInvariants = (game: Game) => {
  const cards = allCardsOf(game)
  expect(cards).toHaveLength(52)
  expect(new Set(cards).size).toBe(52)
  for (const player of game.players) {
    const ranks = player.melds.map((meld) => meld.rank)
    expect(new Set(ranks).size).toBe(ranks.length)
    for (const meld of player.melds) {
      expect(meld.cards.length).toBeGreaterThanOrEqual(2)
      expect(meld.cards.length).toBeLessThanOrEqual(4)
    }
  }
  if (!isFinished(game)) {
    expect(game.players.some((player) => player.id === game.turn.playerId)).toBe(true)
  }
}

const assertHintsAreTruthful = (game: Game) => {
  const playerId = game.turn.playerId
  const view = toPlayerView(game, playerId)
  const { plays } = computeHints(view)
  for (const { action } of plays) {
    expect(applyTurnAction(game, playerId, action).ok).toBe(true)
  }
  expect(plays.length > 0 || view.canEndTurn).toBe(true)
  expect(view.canEndTurn).toBe(endTurn(game, playerId, seededRandom(1)).ok)
}

const assertRefusalChangesNothing = (game: Game, playerId: PlayerId, action: TurnAction) => {
  const before = structuredClone(game)
  const result = playTurn(game, playerId, action, seededRandom(1))
  if (!result.ok) expect(game).toEqual(before)
  return result
}

const step = (game: Game, random: RandomSource): Game => {
  const roll = random.nextInt(100)
  const current = game.turn.playerId
  if (roll < 40) {
    const legal = computeHints(toPlayerView(game, current)).plays
    if (legal.length === 0) return game
    const result = playTurn(game, current, pick(legal, random).action, random)
    if (!result.ok) throw new Error(`Dica recusada: ${result.error}`)
    return result.value
  }
  if (roll < 80) {
    const actor = pick(game.players, random).id
    const result = assertRefusalChangesNothing(game, actor, randomAction(game, random))
    return result.ok ? result.value : game
  }
  if (roll < 90) {
    const result = endTurn(game, current, random)
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
  const started = startGame(seats, "p0", random)
  if (!started.ok) throw new Error(started.error)
  return started.value
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
      }
    },
    TIMEOUT_MS
  )
})

import { describe, expect, it } from "vitest"
import { DECK_SIZE } from "../../src/domain/cards/card.js"
import { expirePoker, playPoker, removePokerPlayer } from "../../src/domain/games/poker/actions.js"
import { movesOf } from "../../src/domain/games/poker/betting.js"
import type { PokerAction, PokerMoves } from "../../src/domain/games/poker/betting.js"
import { isFinished, isInGame, STARTING_CHIPS } from "../../src/domain/games/poker/model.js"
import type { PokerGame } from "../../src/domain/games/poker/model.js"
import { startGame } from "../../src/domain/games/poker/setup.js"
import type { RandomSource } from "../../src/domain/shared/random.js"
import { seededRandom, unwrap } from "../support/game-builder.js"
import { cardsInPlay, chipsInPlay } from "../support/poker-builder.js"

const MAX_DECISIONS = 20_000
const SEEDS = 40

const choose = (moves: PokerMoves, random: RandomSource): PokerAction => {
  const options: PokerAction[] = []
  if (moves.check) options.push({ type: "check" }, { type: "check" })
  if (moves.call !== null) options.push({ type: "call" }, { type: "call" })
  if (moves.fold) options.push({ type: "fold" })
  const press = moves.bet ?? moves.raise
  if (press) {
    const type = moves.bet ? "bet" : "raise"
    const amount = press.min + random.nextInt(press.max - press.min + 1)
    options.push({ type, amount }, { type, amount: press.max })
  }
  return options[random.nextInt(options.length)] as PokerAction
}

const assertInvariants = (game: PokerGame, totalChips: number) => {
  expect(chipsInPlay(game)).toBe(totalChips)
  expect(game.players.every((player) => player.chips >= 0)).toBe(true)
  if (isFinished(game)) return
  const cards = cardsInPlay(game)
  expect(new Set(cards).size).toBe(cards.length)
  expect(cards).toHaveLength(DECK_SIZE)
  if (game.pending !== null) return
  expect(movesOf(game, game.deal.actorId)).not.toEqual({
    fold: false,
    check: false,
    call: null,
    bet: null,
    raise: null,
  })
}

const playOut = (seed: number) => {
  const random = seededRandom(seed)
  const count = 2 + (seed % 5)
  const seats = Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    team: null,
  }))
  let game = unwrap(startGame(seats, "p0", random))
  const totalChips = count * STARTING_CHIPS
  for (let decision = 0; decision < MAX_DECISIONS && !isFinished(game); decision++) {
    const actorId = game.deal.actorId
    game =
      game.pending !== null || random.nextInt(25) === 0
        ? expirePoker(game, random)
        : unwrap(playPoker(game, actorId, choose(movesOf(game, actorId), random), random))
    assertInvariants(game, totalChips)
  }
  return game
}

describe("simulação de partidas completas", () => {
  it.each(Array.from({ length: SEEDS }, (_, seed) => seed))(
    "semente %i termina com um vencedor e todas as fichas com ele",
    (seed) => {
      const game = playOut(seed)
      expect(game.endReason).toBe("chips")
      const winner = game.players.find((player) => player.id === game.winnerId)
      expect(winner?.chips).toBe(game.players.length * STARTING_CHIPS)
      expect(game.eliminatedIds).toHaveLength(game.players.length - 1)
      expect(game.players.filter(isInGame)).toEqual([winner])
    }
  )

  it("partidas com saídas no meio também terminam", () => {
    for (let seed = 0; seed < 10; seed++) {
      const random = seededRandom(100 + seed)
      const seats = Array.from({ length: 5 }, (_, index) => ({
        id: `p${index}`,
        nickname: `P${index}`,
        team: null,
      }))
      let game = unwrap(startGame(seats, "p2", random))
      for (let decision = 0; decision < MAX_DECISIONS && !isFinished(game); decision++) {
        if (decision % 7 === 3) {
          const alive = game.players.filter(isInGame)
          game = removePokerPlayer(
            game,
            (alive[random.nextInt(alive.length)] as { id: string }).id,
            random
          )
          continue
        }
        const actorId = game.deal.actorId
        game =
          game.pending !== null
            ? expirePoker(game, random)
            : unwrap(playPoker(game, actorId, choose(movesOf(game, actorId), random), random))
      }
      expect(isFinished(game)).toBe(true)
      expect(game.eliminatedIds).toHaveLength(4)
    }
  })
})

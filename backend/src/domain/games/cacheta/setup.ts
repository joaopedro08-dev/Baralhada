import { createFullDeck } from "../../cards/card.js"
import type { Card } from "../../cards/card.js"
import type { RandomSource } from "../../shared/random.js"
import { shuffle } from "../../shared/random.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { PlayerId, Seat } from "../../shared/seat.js"
import type { CachetaErrorCode } from "./errors.js"
import {
  DECK_COUNT,
  HAND_SIZE,
  isPlaying,
  PLAYER_COUNTS,
  STARTING_POINTS,
  withEvents,
} from "./model.js"
import type { CachetaGame } from "./model.js"

export const createCachetaDeck = (): readonly Card[] =>
  Array.from({ length: DECK_COUNT }, createFullDeck).flat()

export const dealRound = (
  game: CachetaGame,
  round: number,
  starterId: PlayerId,
  random: RandomSource
): CachetaGame => {
  const deck = shuffle(createCachetaDeck(), random)
  let dealt = 0
  const players = game.players.map((player) => {
    if (!isPlaying(player)) return { ...player, hand: [] }
    const hand = deck.slice(dealt, dealt + HAND_SIZE)
    dealt += HAND_SIZE
    return { ...player, hand }
  })
  const vira = deck[dealt] as Card
  return withEvents(
    {
      ...game,
      players,
      round,
      starterId,
      vira,
      stock: deck.slice(dealt + 1),
      discard: [],
      turn: { number: game.turn.number + 1, playerId: starterId, stage: "start", drawn: null },
      pending: null,
    },
    { type: "dealt", round, vira }
  )
}

export const startGame = (
  seats: readonly Seat[],
  starterId: PlayerId,
  random: RandomSource
): Result<CachetaGame, CachetaErrorCode> => {
  if (!(PLAYER_COUNTS as readonly number[]).includes(seats.length)) {
    return err("CACHETA_PLAYER_COUNT")
  }
  const blank: CachetaGame = {
    nicknames: Object.fromEntries(seats.map((seat) => [seat.id, seat.nickname])),
    players: seats.map((seat) => ({
      id: seat.id,
      hand: [],
      points: STARTING_POINTS,
      status: "playing",
    })),
    round: 0,
    starterId,
    vira: "AC",
    stock: [],
    discard: [],
    turn: { number: 0, playerId: starterId, stage: "start", drawn: null },
    pending: null,
    lastRound: null,
    eliminations: [],
    events: [],
    endReason: null,
    winnerId: null,
  }
  return ok(dealRound(blank, 1, starterId, random))
}

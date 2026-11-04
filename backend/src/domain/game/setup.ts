import { createFullDeck } from "../cards/card.js"
import type { RandomSource } from "../shared/random.js"
import { pickOne, shuffle } from "../shared/random.js"
import { err, ok } from "../shared/result.js"
import type { Result } from "../shared/result.js"
import type { GameErrorCode } from "./errors.js"
import { HAND_SIZE, MAX_PLAYERS, MIN_PLAYERS, TABLE_SIZE } from "./model.js"
import type { Game, GamePlayer, PlayerId } from "./model.js"

export interface Seat {
  readonly id: PlayerId
  readonly nickname: string
}

export const startGame = (
  seats: readonly Seat[],
  startingPlayerId: PlayerId,
  random: RandomSource
): Result<Game, GameErrorCode> => {
  if (seats.length < MIN_PLAYERS || seats.length > MAX_PLAYERS) return err("INVALID_PLAYER_COUNT")

  const deck = shuffle(createFullDeck(), random)
  const players: GamePlayer[] = seats.map((seat, index) => ({
    id: seat.id,
    hand: deck.slice(index * HAND_SIZE, (index + 1) * HAND_SIZE),
    melds: [],
  }))
  const dealt = seats.length * HAND_SIZE

  return ok({
    nicknames: Object.fromEntries(seats.map((seat) => [seat.id, seat.nickname])),
    players,
    table: deck.slice(dealt, dealt + TABLE_SIZE),
    deck: deck.slice(dealt + TABLE_SIZE),
    turn: { number: 1, playerId: startingPlayerId, usedActions: [] },
    events: [],
    endReason: null,
    winnerIds: [],
  })
}

export const chooseStartingPlayer = (
  seats: readonly Seat[],
  previousStarterId: PlayerId | null,
  random: RandomSource
): PlayerId => {
  const previousIndex = seats.findIndex((seat) => seat.id === previousStarterId)
  if (previousIndex < 0) return pickOne(seats, random).id
  return (seats[(previousIndex + 1) % seats.length] as Seat).id
}

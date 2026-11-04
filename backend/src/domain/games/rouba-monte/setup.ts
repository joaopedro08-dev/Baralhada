import { createFullDeck } from "../../cards/card.js"
import type { RandomSource } from "../../shared/random.js"
import { shuffle } from "../../shared/random.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { GameErrorCode } from "./errors.js"
import { HAND_SIZE, MAX_PLAYERS, MIN_PLAYERS, TABLE_SIZE } from "./model.js"
import type { Seat } from "../../shared/seat.js"
import type { Game, GamePlayer, PlayerId } from "./model.js"

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

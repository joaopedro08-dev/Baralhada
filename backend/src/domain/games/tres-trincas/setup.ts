import { createFullDeck } from "../../cards/card.js"
import type { Card } from "../../cards/card.js"
import type { RandomSource } from "../../shared/random.js"
import { shuffle } from "../../shared/random.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { PlayerId, Seat } from "../../shared/seat.js"
import type { TrincaErrorCode } from "./errors.js"
import { HAND_SIZE, PLAYER_COUNTS } from "./model.js"
import type { TrincaGame } from "./model.js"

export const startGame = (
  seats: readonly Seat[],
  starterId: PlayerId,
  random: RandomSource
): Result<TrincaGame, TrincaErrorCode> => {
  if (!(PLAYER_COUNTS as readonly number[]).includes(seats.length)) {
    return err("INVALID_PLAYER_COUNT")
  }
  const deck = shuffle(createFullDeck(), random)
  const dealt = seats.length * HAND_SIZE
  const vira = deck[dealt] as Card
  return ok({
    nicknames: Object.fromEntries(seats.map((seat) => [seat.id, seat.nickname])),
    players: seats.map((seat, index) => ({
      id: seat.id,
      hand: deck.slice(index * HAND_SIZE, (index + 1) * HAND_SIZE),
      sets: [],
    })),
    vira,
    stock: deck.slice(dealt + 1),
    discard: [],
    turn: { number: 1, playerId: starterId, stage: "start" },
    events: [{ type: "dealt", vira }],
    endReason: null,
    winnerId: null,
  })
}

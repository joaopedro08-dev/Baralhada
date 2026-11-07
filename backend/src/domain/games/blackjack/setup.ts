import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { PlayerId, Seat } from "../../shared/seat.js"
import type { RandomSource } from "../../shared/random.js"
import type { BlackjackErrorCode } from "./errors.js"
import { PLAYER_COUNTS, STARTING_CHIPS } from "./model.js"
import type { BlackjackGame } from "./model.js"
import { beginRound } from "./round.js"

export const startGame = (
  seats: readonly Seat[],
  _starterId: PlayerId,
  _random: RandomSource
): Result<BlackjackGame, BlackjackErrorCode> => {
  if (!(PLAYER_COUNTS as readonly number[]).includes(seats.length)) {
    return err("BLACKJACK_PLAYER_COUNT")
  }
  const blank: BlackjackGame = {
    nicknames: Object.fromEntries(seats.map((seat) => [seat.id, seat.nickname])),
    players: seats.map((seat) => ({
      id: seat.id,
      chips: STARTING_CHIPS,
      bet: null,
      hands: [],
      status: "playing",
    })),
    round: 0,
    phase: "betting",
    deck: [],
    dealer: { cards: [], revealed: false },
    turn: { number: 0, playerId: null, handIndex: 0 },
    lastRound: null,
    events: [],
    endReason: null,
    winnerIds: [],
  }
  return ok(beginRound(blank, 1))
}

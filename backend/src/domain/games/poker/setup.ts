import type { RandomSource } from "../../shared/random.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { PlayerId, Seat } from "../../shared/seat.js"
import type { PokerErrorCode } from "./errors.js"
import { dealHand } from "./hand-flow.js"
import { blindsFor, PLAYER_COUNTS, STARTING_CHIPS } from "./model.js"
import type { PokerGame } from "./model.js"

export const startGame = (
  seats: readonly Seat[],
  starterId: PlayerId,
  random: RandomSource
): Result<PokerGame, PokerErrorCode> => {
  if (!(PLAYER_COUNTS as readonly number[]).includes(seats.length)) {
    return err("INVALID_PLAYER_COUNT")
  }
  const table: PokerGame = {
    nicknames: Object.fromEntries(seats.map((seat) => [seat.id, seat.nickname])),
    players: seats.map((seat) => ({
      id: seat.id,
      chips: STARTING_CHIPS,
      hole: [],
      bet: 0,
      committed: 0,
      status: "active",
      acted: false,
    })),
    deal: {
      number: 0,
      buttonId: starterId,
      smallBlindId: starterId,
      bigBlindId: starterId,
      blinds: blindsFor(1),
      street: "preflop",
      board: [],
      deck: [],
      currentBet: 0,
      minRaise: 0,
      actorId: starterId,
    },
    step: 1,
    events: [],
    lastHand: null,
    eliminatedIds: [],
    winnerId: null,
    endReason: null,
  }
  return ok(dealHand(table, 1, starterId, random))
}

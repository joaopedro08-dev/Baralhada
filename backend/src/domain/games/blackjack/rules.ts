import type { GameRules } from "../../room/game-rules.js"
import { expireBlackjack, playBlackjack, removeBlackjackPlayer } from "./actions.js"
import type { BlackjackAction } from "./actions.js"
import type { BlackjackErrorCode } from "./errors.js"
import {
  BLACKJACK_ID,
  DEAL_DONE_MS,
  DEAL_STEP_MS,
  DEALER_STEP_MS,
  FINAL_PAUSE_MS,
  HAND_CLOSE_MS,
  isFinished,
  NATURAL_PAUSE_MS,
  PLAYER_COUNTS,
  SETTLE_PAUSE_MS,
  TURN_DURATION_MS,
} from "./model.js"
import type { BlackjackGame } from "./model.js"
import { isBlackjackHand } from "./scoring.js"
import { startGame } from "./setup.js"

const closedHands = (game: BlackjackGame): number =>
  game.players.reduce((total, seat) => total + seat.hands.filter((hand) => hand.done).length, 0)

const hasNatural = (game: BlackjackGame): boolean =>
  game.players.some((seat) => seat.hands.some(isBlackjackHand))

export const blackjackPauseAfter = (previous: BlackjackGame, next: BlackjackGame): number => {
  if (next.phase === "settled" && previous.phase !== "settled") {
    return isFinished(next) ? FINAL_PAUSE_MS : SETTLE_PAUSE_MS
  }
  if (next.phase === "dealing") return DEAL_STEP_MS
  if (previous.phase === "dealing") return hasNatural(next) ? NATURAL_PAUSE_MS : DEAL_DONE_MS
  if (next.phase === "dealer") return DEALER_STEP_MS
  return closedHands(next) > closedHands(previous) ? HAND_CLOSE_MS : 0
}

const turnOwner = (game: BlackjackGame): string => {
  if ((game.phase === "playing" || game.phase === "insurance") && game.turn.playerId) {
    return game.turn.playerId
  }
  const waiting = game.players.find((seat) => seat.status === "playing" && seat.bet === null)
  return waiting?.id ?? game.players[0]?.id ?? ""
}

export const blackjackRules: GameRules<BlackjackGame, BlackjackAction, BlackjackErrorCode> = {
  id: BLACKJACK_ID,
  playerCounts: PLAYER_COUNTS,
  teamCount: null,
  turnDurationMs: TURN_DURATION_MS,
  start: startGame,
  play: playBlackjack,
  expireTurn: expireBlackjack,
  removePlayer: removeBlackjackPlayer,
  turnOf: (game) => ({
    number: game.turn.number,
    playerId: turnOwner(game),
    automatic:
      game.phase !== "betting" &&
      game.phase !== "playing" &&
      game.phase !== "insurance",
  }),
  isFinished,
  pauseAfter: blackjackPauseAfter,
}

import type { GameRules } from "../../room/game-rules.js"
import { expirePoker, playPoker, removePokerPlayer } from "./actions.js"
import type { PokerAction } from "./betting.js"
import type { PokerErrorCode } from "./errors.js"
import {
  BOARD_SIZE,
  isFinished,
  PLAYER_COUNTS,
  POKER_ID,
  STREETS,
  TURN_DURATION_MS,
} from "./model.js"
import type { PokerGame } from "./model.js"
import { startGame } from "./setup.js"

export const FOLD_WIN_PAUSE_MS = 2600
export const SHOWDOWN_PAUSE_MS = 5200
export const STREET_PAUSE_MS = 900
export const RUNOUT_STREET_MS = 1100

const streetsBetween = (fromSize: number, toSize: number): number =>
  STREETS.filter((street) => BOARD_SIZE[street] > fromSize && BOARD_SIZE[street] <= toSize).length

export const pokerPauseAfter = (previous: PokerGame, next: PokerGame): number => {
  const summary = next.lastHand
  if (summary && summary.number !== previous.lastHand?.number) {
    const before = previous.deal.number === summary.number ? previous.deal.board.length : 0
    const runout = streetsBetween(before, summary.board.length) * RUNOUT_STREET_MS
    return (summary.showdown ? SHOWDOWN_PAUSE_MS : FOLD_WIN_PAUSE_MS) + runout
  }
  return next.deal.board.length > previous.deal.board.length ? STREET_PAUSE_MS : 0
}

export const pokerRules: GameRules<PokerGame, PokerAction, PokerErrorCode> = {
  id: POKER_ID,
  playerCounts: PLAYER_COUNTS,
  teamCount: null,
  turnDurationMs: TURN_DURATION_MS,
  start: startGame,
  play: playPoker,
  expireTurn: expirePoker,
  removePlayer: removePokerPlayer,
  turnOf: (game) => ({ number: game.step, playerId: game.deal.actorId }),
  isFinished,
  pauseAfter: pokerPauseAfter,
}

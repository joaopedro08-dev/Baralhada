import type { GameRules } from "../../room/game-rules.js"
import { expirePoker, playPoker, removePokerPlayer } from "./actions.js"
import type { PokerAction } from "./betting.js"
import type { PokerErrorCode } from "./errors.js"
import { isFinished, PLAYER_COUNTS, POKER_ID, TURN_DURATION_MS } from "./model.js"
import type { PokerGame } from "./model.js"
import { startGame } from "./setup.js"

export const FOLD_WIN_PAUSE_MS = 3000
export const SHOWDOWN_PAUSE_MS = 6000
export const BETTING_CLOSED_PAUSE_MS = 1000
export const RUNOUT_STREET_MS = 1600
export const STREET_REVEAL_MS = 700
export const DEAL_PAUSE_MS = 900

const isWaiting = (game: PokerGame): boolean =>
  game.pending === "street" || game.pending === "showdown"

export const pokerPauseAfter = (previous: PokerGame, next: PokerGame): number => {
  const summary = next.lastHand
  if (summary && summary.number !== previous.lastHand?.number) {
    return summary.showdown ? SHOWDOWN_PAUSE_MS : FOLD_WIN_PAUSE_MS
  }
  const boardGrew = next.deal.board.length > previous.deal.board.length
  if (isWaiting(next)) return boardGrew ? RUNOUT_STREET_MS : BETTING_CLOSED_PAUSE_MS
  if (boardGrew) return STREET_REVEAL_MS
  return next.deal.number > previous.deal.number ? DEAL_PAUSE_MS : 0
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
  turnOf: (game) => ({
    number: game.step,
    playerId: game.deal.actorId,
    automatic: game.pending !== null,
  }),
  isFinished,
  pauseAfter: pokerPauseAfter,
}

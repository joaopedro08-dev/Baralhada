import type { GameRules } from "../../room/game-rules.js"
import { expireCacheta, playCacheta, removeCachetaPlayer } from "./actions.js"
import type { CachetaAction } from "./actions.js"
import type { CachetaErrorCode } from "./errors.js"
import {
  CACHETA_ID,
  DEAL_PAUSE_MS,
  isFinished,
  KNOCK_PAUSE_MS,
  PLAYER_COUNTS,
  TURN_DURATION_MS,
} from "./model.js"
import type { CachetaGame } from "./model.js"
import { startGame } from "./setup.js"

export const cachetaPauseAfter = (previous: CachetaGame, next: CachetaGame): number => {
  if (next.lastRound !== previous.lastRound && next.lastRound !== null) return KNOCK_PAUSE_MS
  return next.round !== previous.round ? DEAL_PAUSE_MS : 0
}

export const cachetaRules: GameRules<CachetaGame, CachetaAction, CachetaErrorCode> = {
  id: CACHETA_ID,
  playerCounts: PLAYER_COUNTS,
  teamCount: null,
  turnDurationMs: TURN_DURATION_MS,
  start: startGame,
  play: playCacheta,
  expireTurn: expireCacheta,
  removePlayer: removeCachetaPlayer,
  turnOf: (game) => ({
    number: game.turn.number,
    playerId: game.turn.playerId,
    automatic: game.pending !== null,
  }),
  isFinished,
  pauseAfter: cachetaPauseAfter,
}

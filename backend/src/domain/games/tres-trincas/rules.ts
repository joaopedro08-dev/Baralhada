import type { GameRules } from "../../room/game-rules.js"
import { expireTrincas, playTrincas, removeTrincasPlayer } from "./actions.js"
import type { TrincaAction } from "./actions.js"
import type { TrincaErrorCode } from "./errors.js"
import {
  isFinished,
  PLAYER_COUNTS,
  TRES_TRINCAS_ID,
  TURN_DURATION_MS,
  WIN_PAUSE_MS,
} from "./model.js"
import type { TrincaGame } from "./model.js"
import { startGame } from "./setup.js"

export const trincasPauseAfter = (previous: TrincaGame, next: TrincaGame): number =>
  next.endReason === "sets" && !isFinished(previous) ? WIN_PAUSE_MS : 0

export const tresTrincasRules: GameRules<TrincaGame, TrincaAction, TrincaErrorCode> = {
  id: TRES_TRINCAS_ID,
  playerCounts: PLAYER_COUNTS,
  teamCount: null,
  turnDurationMs: TURN_DURATION_MS,
  start: startGame,
  play: playTrincas,
  expireTurn: expireTrincas,
  removePlayer: removeTrincasPlayer,
  winnerIds: (game) => (game.winnerId === null ? [] : [game.winnerId]),
  turnOf: (game) => ({ number: game.turn.number, playerId: game.turn.playerId }),
  isFinished,
  pauseAfter: trincasPauseAfter,
}

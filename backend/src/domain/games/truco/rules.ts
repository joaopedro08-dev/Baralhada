import type { GameRules } from "../../room/game-rules.js"
import { expireTruco, playsDuringPause, playTruco, removeTrucoPlayer } from "./actions.js"
import type { TrucoAction } from "./actions.js"
import type { TrucoErrorCode } from "./errors.js"
import {
  actorOf,
  isFinished,
  PLAYER_COUNTS,
  TEAM_COUNT,
  TRUCO_ID,
  TURN_DURATION_MS,
} from "./model.js"
import type { TrucoGame } from "./model.js"
import { trucoPauseAfter } from "./pacing.js"
import { startGame } from "./setup.js"

export const trucoRules: GameRules<TrucoGame, TrucoAction, TrucoErrorCode> = {
  id: TRUCO_ID,
  playerCounts: PLAYER_COUNTS,
  teamCount: TEAM_COUNT,
  turnDurationMs: TURN_DURATION_MS,
  start: startGame,
  play: playTruco,
  expireTurn: expireTruco,
  removePlayer: removeTrucoPlayer,
  turnOf: (game) => ({ number: game.step, playerId: actorOf(game.hand) }),
  isFinished,
  pauseAfter: trucoPauseAfter,
  playsDuringPause,
}

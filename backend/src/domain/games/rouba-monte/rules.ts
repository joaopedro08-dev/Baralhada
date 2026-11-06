import type { GameRules } from "../../room/game-rules.js"
import type { GameErrorCode } from "./errors.js"
import { isFinished, MAX_PLAYERS, MIN_PLAYERS, TURN_DURATION_MS } from "./model.js"
import type { Game } from "./model.js"
import { startGame } from "./setup.js"
import type { TurnAction } from "./turn-actions.js"
import { expireTurn, playTurn, removePlayer } from "./turn-flow.js"

const PLAYER_COUNTS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, offset) => MIN_PLAYERS + offset
)

export const ROUBA_MONTE_ID = "rouba-monte"

export const roubaMonteRules: GameRules<Game, TurnAction, GameErrorCode> = {
  id: ROUBA_MONTE_ID,
  playerCounts: PLAYER_COUNTS,
  teamCount: null,
  turnDurationMs: TURN_DURATION_MS,
  start: startGame,
  play: playTurn,
  expireTurn,
  removePlayer,
  turnOf: (game) => ({ number: game.turn.number, playerId: game.turn.playerId }),
  isFinished,
}

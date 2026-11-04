import type { GameRules } from "../../room/game-rules.js"
import type { GameErrorCode } from "./errors.js"
import { isFinished, MAX_PLAYERS, MIN_PLAYERS } from "./model.js"
import type { Game } from "./model.js"
import { startGame } from "./setup.js"
import type { TurnAction } from "./turn-actions.js"
import { endTurn, expireTurn, playTurn, removePlayer } from "./turn-flow.js"

export const roubaMonteRules: GameRules<Game, TurnAction, GameErrorCode> = {
  id: "rouba-monte",
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  start: startGame,
  play: playTurn,
  pass: endTurn,
  expireTurn,
  removePlayer,
  turnOf: (game) => ({ number: game.turn.number, playerId: game.turn.playerId }),
  isFinished,
}

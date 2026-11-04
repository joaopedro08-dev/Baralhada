import type { GameErrorCode } from "../../domain/games/rouba-monte/errors.js"
import type { Game } from "../../domain/games/rouba-monte/model.js"
import type { TurnAction } from "../../domain/games/rouba-monte/turn-actions.js"
import type { Room } from "../../domain/room/room.js"

export type { Game, GameErrorCode, TurnAction }

export type GameRoom = Room<Game>

import type { GameErrorCode } from "../domain/game/errors.js"
import type { RoomErrorCode } from "../domain/room/errors.js"

export type ApplicationErrorCode =
  | GameErrorCode
  | RoomErrorCode
  | "ROOM_NOT_FOUND"
  | "SERVER_FULL"
  | "ROOM_CODE_UNAVAILABLE"
  | "INVALID_RECONNECT"
  | "GAME_NOT_RUNNING"
  | "MATCH_STARTING"

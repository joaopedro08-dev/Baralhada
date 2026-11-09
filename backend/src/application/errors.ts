import type { RoomErrorCode } from "../domain/room/errors.js"

export type PlatformErrorCode =
  | RoomErrorCode
  | "ROOM_NOT_FOUND"
  | "SERVER_FULL"
  | "ROOM_CODE_UNAVAILABLE"
  | "INVALID_RECONNECT"
  | "GAME_NOT_RUNNING"
  | "MATCH_STARTING"
  | "HINTS_DISABLED"
  | "TABLE_PAUSED"
  | "TABLE_ALREADY_PAUSED"
  | "TABLE_NOT_PAUSED"

export type ApplicationErrorCode<GameCode extends string = never> = PlatformErrorCode | GameCode

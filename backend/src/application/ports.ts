import type { Room } from "../domain/room/room.js"
import type { PlayerId } from "../domain/shared/seat.js"

export interface RoomRepository<State = unknown> {
  find(code: string): Room<State> | undefined
  save(room: Room<State>): void
  remove(code: string): void
  all(): Iterable<Room<State>>
  count(): number
}

export type RemovalReason = "kicked"

export interface RoomNotifier {
  publish(room: Room): void
  notifyRemoved(playerId: PlayerId, reason: RemovalReason): void
}

export interface TurnScheduler {
  schedule(roomCode: string, turnNumber: number, delayMs: number): void
  cancel(roomCode: string): void
}

export interface Clock {
  now(): number
}

export interface IdentityGenerator {
  roomCode(): string
  playerId(): PlayerId
  reconnectToken(): string
}

export interface Logger {
  info(context: object, message: string): void
  error(context: object, message: string): void
}

export interface GameSettings {
  readonly turnDurationOverrideMs: number | null
  readonly pauseOverrideMs: number | null
  readonly matchCountdownMs: number
  readonly reconnectGraceMs: number
  readonly emptyRoomTtlMs: number
  readonly maxRooms: number
}

import type { RoomState } from "@/lib/game/domain/types"

export const withLocalDeadline = (
  room: RoomState,
  localNow: number
): RoomState => {
  const toLocal = (serverTime: number | null): number | null =>
    serverTime === null ? null : serverTime - room.serverNow + localNow
  return {
    ...room,
    turnDeadlineAt: toLocal(room.turnDeadlineAt),
    matchStartsAt: toLocal(room.matchStartsAt),
    pausedUntil: toLocal(room.pausedUntil),
  }
}

export const keepLocalClock = (
  previousServer: RoomState,
  previousLocal: RoomState,
  nextServer: RoomState,
  nextLocal: RoomState
): RoomState => {
  const keep = (
    field: "turnDeadlineAt" | "matchStartsAt" | "pausedUntil"
  ): number | null =>
    previousServer[field] === nextServer[field]
      ? previousLocal[field]
      : nextLocal[field]
  return {
    ...nextLocal,
    turnDeadlineAt: keep("turnDeadlineAt"),
    matchStartsAt: keep("matchStartsAt"),
    pausedUntil: keep("pausedUntil"),
  }
}

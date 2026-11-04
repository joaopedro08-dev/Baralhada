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
  }
}

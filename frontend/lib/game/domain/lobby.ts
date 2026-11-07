import { gameInfo, maxPlayersOf } from "@/lib/game/domain/catalog"
import type { PlayerId, RoomPlayer, RoomState } from "@/lib/game/domain/types"

export type LobbySeat =
  | { readonly kind: "player"; readonly player: RoomPlayer }
  | { readonly kind: "empty"; readonly index: number }

export interface SeatPosition {
  readonly left: string
  readonly top: string
}

const round = (value: number): number => Math.round(value * 100) / 100

export const lobbySeats = (room: RoomState): readonly LobbySeat[] => {
  const capacity = Math.max(
    maxPlayersOf(gameInfo(room.gameId)),
    room.players.length
  )
  const viewerIndex = room.players.findIndex(
    (player) => player.id === room.viewerId
  )
  const start = Math.max(viewerIndex, 0)
  const ordered = [
    ...room.players.slice(start),
    ...room.players.slice(0, start),
  ]
  const filled: LobbySeat[] = ordered.map((player) => ({
    kind: "player",
    player,
  }))
  const empty: LobbySeat[] = Array.from(
    { length: capacity - ordered.length },
    (_, index) => ({ kind: "empty", index })
  )
  return [...filled, ...empty]
}

export const seatPosition = (
  index: number,
  total: number,
  radiusX = 40,
  radiusY = 38
): SeatPosition => {
  const angle = Math.PI / 2 + (index * 2 * Math.PI) / Math.max(total, 1)
  return {
    left: `${round(50 + radiusX * Math.cos(angle))}%`,
    top: `${round(50 + radiusY * Math.sin(angle))}%`,
  }
}

export const teamOf = (room: RoomState, playerId: PlayerId): number | null => {
  const team = room.teams?.findIndex((members) => members.includes(playerId))
  return team === undefined || team < 0 ? null : team
}

export const minimumPlayers = (room: RoomState): number =>
  gameInfo(room.gameId).playerCounts[0] ?? 2

export const readiness = (room: RoomState): number =>
  Math.min(100, Math.round((room.players.length / minimumPlayers(room)) * 100))

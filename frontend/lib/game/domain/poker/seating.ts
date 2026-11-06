import type { PlayerId } from "@/lib/game/domain/types"

export interface SeatSpot {
  readonly playerId: PlayerId
  readonly seat: { readonly x: number; readonly y: number }
  readonly bet: { readonly x: number; readonly y: number }
}

const VIEWER_ANGLE = 90
const FULL_TURN = 360
const SEAT_RADIUS = { x: 44, y: 41 }
const BET_RADIUS = { x: 23, y: 25 }
const CENTER = 50

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

const pointAt = (
  degrees: number,
  radius: { readonly x: number; readonly y: number }
) => ({
  x: Math.round((CENTER + radius.x * Math.cos(toRadians(degrees))) * 10) / 10,
  y: Math.round((CENTER + radius.y * Math.sin(toRadians(degrees))) * 10) / 10,
})

export const seatOrderFrom = (
  playerIds: readonly PlayerId[],
  viewerId: PlayerId
): readonly PlayerId[] => {
  const index = playerIds.indexOf(viewerId)
  if (index < 0) return playerIds
  return [...playerIds.slice(index), ...playerIds.slice(0, index)]
}

export const seatSpots = (
  playerIds: readonly PlayerId[],
  viewerId: PlayerId
): readonly SeatSpot[] => {
  const ordered = seatOrderFrom(playerIds, viewerId)
  const viewerSeated = playerIds.includes(viewerId)
  const slots = ordered.length + (viewerSeated ? 0 : 1)
  return ordered.map((playerId, index) => {
    const position = index + (viewerSeated ? 0 : 1)
    const angle = VIEWER_ANGLE + (FULL_TURN * position) / slots
    return {
      playerId,
      seat: pointAt(angle, SEAT_RADIUS),
      bet: pointAt(angle, BET_RADIUS),
    }
  })
}

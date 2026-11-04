import type { SeatStore } from "@/lib/game/application/ports"
import type { Seat } from "@/lib/game/domain/types"

const STORAGE_KEY = "rouba-monte:assento"

const isSeat = (value: unknown): value is Seat => {
  if (typeof value !== "object" || value === null) return false
  const seat = value as Record<string, unknown>
  return [
    seat.code,
    seat.nickname,
    seat.playerId,
    seat.reconnectToken,
    seat.inviteUrl,
  ].every((field) => typeof field === "string" && field.length > 0)
}

export const createLocalSeatStore = (): SeatStore => ({
  load() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      const parsed: unknown = stored ? JSON.parse(stored) : null
      return isSeat(parsed) ? parsed : null
    } catch {
      return null
    }
  },

  save(seat) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seat))
    } catch {
      return
    }
  },

  forget() {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      return
    }
  },
})

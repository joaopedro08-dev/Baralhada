import type { RandomSource } from "../shared/random.js"
import { pickOne } from "../shared/random.js"
import type { PlayerId } from "../shared/seat.js"

interface Seated {
  readonly id: PlayerId
}

export const chooseStartingPlayer = (
  seats: readonly Seated[],
  previousStarterId: PlayerId | null,
  random: RandomSource
): PlayerId => {
  const previousIndex = seats.findIndex((seat) => seat.id === previousStarterId)
  if (previousIndex < 0) return pickOne(seats, random).id
  return (seats[(previousIndex + 1) % seats.length] as Seated).id
}

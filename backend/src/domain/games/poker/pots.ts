import type { PlayerId, Pot } from "./model.js"

export interface Contribution {
  readonly playerId: PlayerId
  readonly amount: number
  readonly live: boolean
}

const sameIds = (first: readonly PlayerId[], second: readonly PlayerId[]): boolean =>
  first.length === second.length && first.every((id, index) => id === second[index])

const layerAmount = (contributions: readonly Contribution[], floor: number, level: number) =>
  contributions.reduce(
    (total, { amount }) => total + Math.max(0, Math.min(amount, level) - floor),
    0
  )

export const buildPots = (contributions: readonly Contribution[]): readonly Pot[] => {
  const levels = [...new Set(contributions.map(({ amount }) => amount))]
    .filter((amount) => amount > 0)
    .sort((first, second) => first - second)
  const pots: Pot[] = []
  let floor = 0
  for (const level of levels) {
    const amount = layerAmount(contributions, floor, level)
    const eligibleIds = contributions
      .filter((contribution) => contribution.live && contribution.amount >= level)
      .map(({ playerId }) => playerId)
    floor = level
    const last = pots.at(-1)
    if (last && (eligibleIds.length === 0 || sameIds(last.eligibleIds, eligibleIds))) {
      pots[pots.length - 1] = { ...last, amount: last.amount + amount }
    } else {
      pots.push({ amount, eligibleIds })
    }
  }
  return pots
}

export const splitPot = (
  amount: number,
  winnerIds: readonly PlayerId[]
): ReadonlyMap<PlayerId, number> => {
  const share = Math.floor(amount / winnerIds.length)
  const oddChips = amount - share * winnerIds.length
  return new Map(
    winnerIds.map((playerId, index) => [playerId, share + (index === 0 ? oddChips : 0)])
  )
}

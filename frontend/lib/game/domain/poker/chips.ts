export const CHIP_VALUES = [1000, 500, 100, 25, 5, 1] as const

export type ChipValue = (typeof CHIP_VALUES)[number]

export const chipBreakdown = (
  amount: number,
  limit: number
): readonly ChipValue[] => {
  const chips: ChipValue[] = []
  let rest = Math.max(0, Math.floor(amount))
  for (const value of CHIP_VALUES) {
    while (rest >= value && chips.length < limit) {
      chips.push(value)
      rest -= value
    }
  }
  return chips.reverse()
}

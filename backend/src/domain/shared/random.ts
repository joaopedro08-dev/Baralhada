export interface RandomSource {
  nextInt(maxExclusive: number): number
}

export const shuffle = <T>(items: readonly T[], random: RandomSource): T[] => {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = random.nextInt(index + 1)
    const current = shuffled[index] as T
    shuffled[index] = shuffled[swapIndex] as T
    shuffled[swapIndex] = current
  }
  return shuffled
}

export const pickOne = <T>(items: readonly T[], random: RandomSource): T =>
  items[random.nextInt(items.length)] as T

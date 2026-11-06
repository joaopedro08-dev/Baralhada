import { rankOf, suitOf } from "../../cards/card.js"
import type { Card, Rank } from "../../cards/card.js"

export const HAND_CATEGORIES = [
  "highCard",
  "pair",
  "twoPair",
  "threeOfAKind",
  "straight",
  "flush",
  "fullHouse",
  "fourOfAKind",
  "straightFlush",
  "royalFlush",
] as const

export type HandCategory = (typeof HAND_CATEGORIES)[number]

export interface RankedHand {
  readonly category: HandCategory
  readonly score: readonly number[]
  readonly cards: readonly Card[]
}

export const BEST_HAND_SIZE = 5

const ACE_HIGH = 14
const WHEEL_HIGH = 5

const RANK_VALUES: Readonly<Record<Rank, number>> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: ACE_HIGH,
}

interface ValueGroup {
  readonly value: number
  readonly cards: readonly Card[]
}

export const valueOf = (card: Card): number => RANK_VALUES[rankOf(card)]

const groupByValue = (cards: readonly Card[]): readonly ValueGroup[] => {
  const groups = new Map<number, Card[]>()
  for (const card of cards) {
    const value = valueOf(card)
    groups.set(value, [...(groups.get(value) ?? []), card])
  }
  return [...groups.entries()]
    .map(([value, grouped]) => ({ value, cards: grouped }))
    .sort((first, second) => second.cards.length - first.cards.length || second.value - first.value)
}

const straightHighOf = (groups: readonly ValueGroup[]): number | null => {
  if (groups.length !== BEST_HAND_SIZE) return null
  const values = groups.map((group) => group.value)
  const [highest = 0, second = 0] = values
  const lowest = values.at(-1) ?? 0
  if (highest - lowest === BEST_HAND_SIZE - 1) return highest
  return highest === ACE_HIGH && second === WHEEL_HIGH ? WHEEL_HIGH : null
}

const straightOrder = (groups: readonly ValueGroup[], high: number): readonly Card[] => {
  const cards = groups.flatMap((group) => group.cards)
  if (high !== WHEEL_HIGH) return cards
  const [ace, ...rest] = cards
  return ace ? [...rest, ace] : cards
}

const made = (category: HandCategory, tiebreak: readonly number[], cards: readonly Card[]) => ({
  category,
  score: [HAND_CATEGORIES.indexOf(category), ...tiebreak],
  cards,
})

const categoryByGroups = (counts: readonly number[], flush: boolean): HandCategory => {
  const [first = 0, second = 0] = counts
  if (first === 4) return "fourOfAKind"
  if (first === 3 && second === 2) return "fullHouse"
  if (flush) return "flush"
  if (first === 3) return "threeOfAKind"
  if (first === 2) return second === 2 ? "twoPair" : "pair"
  return "highCard"
}

const isFlush = (cards: readonly Card[]): boolean =>
  cards.length === BEST_HAND_SIZE && new Set(cards.map(suitOf)).size === 1

export const rankCards = (cards: readonly Card[]): RankedHand => {
  const groups = groupByValue(cards)
  const flush = isFlush(cards)
  const high = straightHighOf(groups)
  if (high !== null) {
    const ordered = straightOrder(groups, high)
    if (!flush) return made("straight", [high], ordered)
    return made(high === ACE_HIGH ? "royalFlush" : "straightFlush", [high], ordered)
  }
  const category = categoryByGroups(
    groups.map((group) => group.cards.length),
    flush
  )
  return made(
    category,
    groups.flatMap((group) => group.cards.map(() => group.value)),
    groups.flatMap((group) => group.cards)
  )
}

export const compareHands = (first: RankedHand, second: RankedHand): number => {
  const length = Math.max(first.score.length, second.score.length)
  for (let index = 0; index < length; index++) {
    const difference = (first.score[index] ?? 0) - (second.score[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

const combinations = <T>(items: readonly T[], size: number): readonly (readonly T[])[] => {
  if (size === 0) return [[]]
  return items.flatMap((item, index) =>
    combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest])
  )
}

export const bestHand = (cards: readonly Card[]): RankedHand =>
  combinations(cards, Math.min(BEST_HAND_SIZE, cards.length))
    .map(rankCards)
    .reduce((best, candidate) => (compareHands(candidate, best) > 0 ? candidate : best))

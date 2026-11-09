import { RANKS, rankOf, suitOf } from "../../cards/card.js"
import type { Card, Rank } from "../../cards/card.js"
import { MAX_JOKERS_PER_MELD, MIN_MELD_SIZE } from "./model.js"
import type { Meld } from "./model.js"

const TRINCA_MAX = 4
const LOWEST = 1
const HIGHEST = RANKS.length + 1
const SEQUENCE_MAX = RANKS.length
const COVER_WEIGHT = 100

export interface Arrangement {
  readonly melds: readonly Meld[]
  readonly jokers: number
  readonly covered: number
}

export interface Knock {
  readonly discard: Card
  readonly melds: readonly Meld[]
  readonly clean: boolean
}

export const wildRankFor = (vira: Card): Rank =>
  RANKS[(RANKS.indexOf(rankOf(vira)) + 1) % RANKS.length] as Rank

export const isWild = (card: Card, wildRank: Rank): boolean => rankOf(card) === wildRank

export const jokerCount = (meld: Meld): number => meld.jokers.filter(Boolean).length

const positionOf = (rank: Rank, aceHigh: boolean): number =>
  rank === "A" && aceHigh ? HIGHEST : RANKS.indexOf(rank) + 1

const allDistinct = (values: readonly unknown[]): boolean => new Set(values).size === values.length

const trincaOf = (naturals: readonly Card[], jokers: readonly Card[]): Meld | null => {
  const size = naturals.length + jokers.length
  if (size < MIN_MELD_SIZE || size > TRINCA_MAX) return null
  if (new Set(naturals.map(rankOf)).size !== 1 || !allDistinct(naturals.map(suitOf))) return null
  return {
    kind: "trinca",
    cards: [...naturals, ...jokers],
    jokers: [...naturals.map(() => false), ...jokers.map(() => true)],
  }
}

const placeSequence = (
  naturals: readonly Card[],
  jokers: readonly Card[],
  aceHigh: boolean
): Meld | null => {
  const size = naturals.length + jokers.length
  const positions = naturals.map((card) => positionOf(rankOf(card), aceHigh))
  if (!allDistinct(positions)) return null
  const lowest = Math.min(...positions)
  const highest = Math.max(...positions)
  const start = Math.max(LOWEST, highest - size + 1)
  if (start > Math.min(lowest, HIGHEST - size + 1)) return null
  const spare = [...jokers]
  const slots = Array.from({ length: size }, (_, offset) => {
    const natural = naturals[positions.indexOf(start + offset)]
    return natural ? { card: natural, joker: false } : { card: spare.shift() as Card, joker: true }
  })
  return {
    kind: "sequencia",
    cards: slots.map((slot) => slot.card),
    jokers: slots.map((slot) => slot.joker),
  }
}

const sequenceOf = (naturals: readonly Card[], jokers: readonly Card[]): Meld | null => {
  const size = naturals.length + jokers.length
  if (size < MIN_MELD_SIZE || size > SEQUENCE_MAX) return null
  if (new Set(naturals.map(suitOf)).size !== 1) return null
  const low = placeSequence(naturals, jokers, false)
  if (low || !naturals.some((card) => rankOf(card) === "A")) return low
  return placeSequence(naturals, jokers, true)
}

const combinations = (items: readonly number[], limit: number): readonly (readonly number[])[] =>
  limit === 0
    ? [[]]
    : [
        [],
        ...items.flatMap((first, position) =>
          combinations(items.slice(position + 1), limit - 1).map((rest) => [first, ...rest])
        ),
      ]

const mayMeld = (cards: readonly Card[], wildRank: Rank): boolean => {
  const fixed = cards.filter((card) => !isWild(card, wildRank))
  return new Set(fixed.map(rankOf)).size <= 1 || new Set(fixed.map(suitOf)).size <= 1
}

export const meldOf = (cards: readonly Card[], wildRank: Rank): Meld | null => {
  if (cards.length < MIN_MELD_SIZE || !mayMeld(cards, wildRank)) return null
  const wildIndexes = cards.flatMap((card, index) => (isWild(card, wildRank) ? [index] : []))
  const choices = [...combinations(wildIndexes, MAX_JOKERS_PER_MELD)].sort(
    (first, second) => first.length - second.length
  )
  for (const choice of choices) {
    if (choice.length >= cards.length) continue
    const jokers = choice.map((index) => cards[index] as Card)
    const naturals = cards.filter((_, index) => !choice.includes(index))
    const meld = trincaOf(naturals, jokers) ?? sequenceOf(naturals, jokers)
    if (meld) return meld
  }
  return null
}

const bitCount = (mask: number): number => {
  let count = 0
  for (let rest = mask; rest > 0; rest &= rest - 1) count++
  return count
}

const EMPTY: Arrangement = { melds: [], jokers: 0, covered: 0 }

const combine = (meld: Meld, rest: Arrangement): Arrangement => ({
  melds: [meld, ...rest.melds],
  jokers: rest.jokers + jokerCount(meld),
  covered: rest.covered + meld.cards.length,
})

const coverScore = (arrangement: Arrangement): number =>
  arrangement.covered * COVER_WEIGHT - arrangement.jokers

interface MaskedMeld {
  readonly mask: number
  readonly meld: Meld
}

const meldsWithin = (cards: readonly Card[], wildRank: Rank): readonly MaskedMeld[] => {
  const found: MaskedMeld[] = []
  const visit = (start: number, mask: number, picked: readonly Card[]) => {
    const meld = meldOf(picked, wildRank)
    if (meld) found.push({ mask, meld })
    cards.forEach((card, index) => {
      if (index < start) return
      const next = [...picked, card]
      if (mayMeld(next, wildRank)) visit(index + 1, mask | (1 << index), next)
    })
  }
  visit(0, 0, [])
  return found
}

export interface HandSolver {
  readonly full: number
  bitOf(card: Card): number
  exact(mask: number): Arrangement | null
  cover(mask: number): Arrangement
}

export const handSolver = (cards: readonly Card[], wildRank: Rank): HandSolver => {
  const exacts = new Map<number, Arrangement | null>()
  const covers = new Map<number, Arrangement>()
  const full = (1 << cards.length) - 1
  const melds = meldsWithin(cards, wildRank)

  const candidates = (mask: number) => {
    const low = mask & -mask
    return melds
      .filter((entry) => entry.mask & low && (entry.mask & ~mask) === 0)
      .map((entry) => ({ meld: entry.meld, rest: mask ^ entry.mask }))
  }

  const exact = (mask: number): Arrangement | null => {
    if (mask === 0) return EMPTY
    const known = exacts.get(mask)
    if (known !== undefined) return known
    let best: Arrangement | null = null
    if (bitCount(mask) >= MIN_MELD_SIZE) {
      for (const { meld, rest } of candidates(mask)) {
        const solved = exact(rest)
        if (!solved) continue
        const candidate = combine(meld, solved)
        if (!best || candidate.jokers < best.jokers) best = candidate
      }
    }
    exacts.set(mask, best)
    return best
  }

  const cover = (mask: number): Arrangement => {
    if (mask === 0) return EMPTY
    const known = covers.get(mask)
    if (known) return known
    let best = cover(mask ^ (mask & -mask))
    for (const { meld, rest } of candidates(mask)) {
      const candidate = combine(meld, cover(rest))
      if (coverScore(candidate) > coverScore(best)) best = candidate
    }
    covers.set(mask, best)
    return best
  }

  return {
    full,
    bitOf: (card) => {
      const index = cards.indexOf(card)
      return index < 0 ? 0 : 1 << index
    },
    exact,
    cover,
  }
}

export const arrangeAll = (cards: readonly Card[], wildRank: Rank): Arrangement | null => {
  const solver = handSolver(cards, wildRank)
  return solver.exact(solver.full)
}

export const bestCover = (cards: readonly Card[], wildRank: Rank): Arrangement => {
  const solver = handSolver(cards, wildRank)
  return solver.cover(solver.full)
}

const knockFrom = (solver: HandSolver, discard: Card): Knock | null => {
  const bit = solver.bitOf(discard)
  const arrangement = bit === 0 ? null : solver.exact(solver.full ^ bit)
  return arrangement ? { discard, melds: arrangement.melds, clean: arrangement.jokers === 0 } : null
}

export const knockWith = (hand: readonly Card[], discard: Card, wildRank: Rank): Knock | null =>
  knockFrom(handSolver(hand, wildRank), discard)

export const findKnock = (
  hand: readonly Card[],
  wildRank: Rank,
  solver: HandSolver = handSolver(hand, wildRank)
): Knock | null => {
  let best: Knock | null = null
  for (const discard of new Set(hand)) {
    const knock = knockFrom(solver, discard)
    if (knock?.clean) return knock
    best ??= knock
  }
  return best
}

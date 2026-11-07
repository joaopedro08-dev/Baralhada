import { rankOf, suitOf } from "@/lib/game/domain/cards"
import { isWildCard } from "@/lib/game/domain/cacheta/guide"
import type { Meld } from "@/lib/game/domain/cacheta/types"
import { RANKS } from "@/lib/game/domain/types"
import type { Card, Rank, Suit } from "@/lib/game/domain/types"

export type HandOrder = "naipe" | "valor" | "jogos"

export type GroupKind = "meld" | "loose" | "wild"

export interface HandSlot {
  readonly key: string
  readonly card: Card
}

export interface HandGroup {
  readonly key: string
  readonly kind: GroupKind
  readonly meld: Meld | null
  readonly slots: readonly HandSlot[]
}

const SUIT_ORDER: readonly Suit[] = ["S", "H", "C", "D"]

const bySuit = (first: Card, second: Card): number =>
  SUIT_ORDER.indexOf(suitOf(first)) - SUIT_ORDER.indexOf(suitOf(second)) ||
  RANKS.indexOf(rankOf(first)) - RANKS.indexOf(rankOf(second))

const byRank = (first: Card, second: Card): number =>
  RANKS.indexOf(rankOf(first)) - RANKS.indexOf(rankOf(second)) ||
  SUIT_ORDER.indexOf(suitOf(first)) - SUIT_ORDER.indexOf(suitOf(second))

export const slotsOf = (cards: readonly Card[]): readonly HandSlot[] => {
  const seen = new Map<Card, number>()
  return cards.map((card) => {
    const copy = seen.get(card) ?? 0
    seen.set(card, copy + 1)
    return { key: `${card}-${copy}`, card }
  })
}

const takeOut = (
  slots: readonly HandSlot[],
  cards: readonly Card[]
): {
  readonly taken: readonly HandSlot[]
  readonly rest: readonly HandSlot[]
} => {
  const rest = [...slots]
  const taken = cards.flatMap((card) => {
    const index = rest.findIndex((slot) => slot.card === card)
    return index < 0 ? [] : rest.splice(index, 1)
  })
  return { taken, rest }
}

const sortedGroups = (
  slots: readonly HandSlot[],
  order: HandOrder,
  wildRank: Rank
): readonly HandGroup[] => {
  const compare = order === "valor" ? byRank : bySuit
  const sorted = [...slots].sort((first, second) =>
    compare(first.card, second.card)
  )
  const wilds = sorted.filter((slot) => isWildCard(slot.card, wildRank))
  const others = sorted.filter((slot) => !isWildCard(slot.card, wildRank))
  const groupKey = (card: Card) =>
    order === "valor" ? rankOf(card) : suitOf(card)
  const groups: HandGroup[] = []
  for (const slot of others) {
    const key = groupKey(slot.card)
    const last = groups.at(-1)
    if (last?.key === key) {
      groups[groups.length - 1] = { ...last, slots: [...last.slots, slot] }
    } else {
      groups.push({ key, kind: "loose", meld: null, slots: [slot] })
    }
  }
  return wilds.length > 0
    ? [...groups, { key: "coringas", kind: "wild", meld: null, slots: wilds }]
    : groups
}

export const arrangeHand = (
  hand: readonly Card[],
  order: HandOrder,
  wildRank: Rank,
  ready: readonly Meld[] = []
): readonly HandGroup[] => {
  const slots = slotsOf(hand)
  if (order !== "jogos" || ready.length === 0) {
    return sortedGroups(slots, order === "jogos" ? "naipe" : order, wildRank)
  }
  let rest = slots
  const melds = ready.map((meld, index): HandGroup => {
    const picked = takeOut(rest, meld.cards)
    rest = picked.rest
    return { key: `jogo-${index}`, kind: "meld", meld, slots: picked.taken }
  })
  return [...melds, ...sortedGroups(rest, "naipe", wildRank)]
}

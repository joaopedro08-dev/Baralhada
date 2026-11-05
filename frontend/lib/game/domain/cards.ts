import { RANKS, SUITS } from "@/lib/game/domain/types"
import type { Card, Rank, Suit } from "@/lib/game/domain/types"

const SUIT_NAMES: Readonly<Record<Suit, string>> = {
  C: "paus",
  D: "ouros",
  H: "copas",
  S: "espadas",
}

const RANK_NAMES: Partial<Readonly<Record<Rank, string>>> = {
  A: "Ás",
  J: "Valete",
  Q: "Dama",
  K: "Rei",
}

export const rankOf = (card: Card): Rank => card.slice(0, -1) as Rank

export const suitOf = (card: Card): Suit => card.slice(-1) as Suit

export const sameRank = (first: Card, second: Card): boolean =>
  rankOf(first) === rankOf(second)

export const isRedSuit = (suit: Suit): boolean => suit === "D" || suit === "H"

export const rankName = (rank: Rank): string => RANK_NAMES[rank] ?? rank

export const cardName = (card: Card): string =>
  `${rankName(rankOf(card))} de ${SUIT_NAMES[suitOf(card)]}`

const cardOrder = (card: Card): number =>
  RANKS.indexOf(rankOf(card)) * SUITS.length + SUITS.indexOf(suitOf(card))

export const sortCards = (cards: readonly Card[]): readonly Card[] =>
  [...cards].sort((a, b) => cardOrder(a) - cardOrder(b))

export const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`

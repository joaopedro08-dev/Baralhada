import { rankOf, suitOf } from "@/lib/game/domain/cards"
import type { Card, Rank, Suit } from "@/lib/game/domain/types"

export const TRUCO_ORDER: readonly Rank[] = [
  "4",
  "5",
  "6",
  "7",
  "Q",
  "J",
  "K",
  "A",
  "2",
  "3",
]

export const MANILHA_SUITS: readonly Suit[] = ["D", "S", "H", "C"]

export const isManilha = (card: Card, manilha: Rank): boolean =>
  rankOf(card) === manilha

export const trucoStrength = (card: Card, manilha: Rank): number =>
  isManilha(card, manilha)
    ? TRUCO_ORDER.length + MANILHA_SUITS.indexOf(suitOf(card))
    : TRUCO_ORDER.indexOf(rankOf(card))

export const sortByStrength = (
  cards: readonly Card[],
  manilha: Rank
): readonly Card[] =>
  [...cards].sort(
    (a, b) => trucoStrength(a, manilha) - trucoStrength(b, manilha)
  )

import { rankOf, suitOf } from "../../domain/cards/card.js"
import type { Card, Rank, Suit } from "../../domain/cards/card.js"

const SUIT_NAMES: Readonly<Record<Suit, string>> = {
  C: "paus",
  D: "ouros",
  H: "copas",
  S: "espadas",
}

const RANK_NAMES: Partial<Readonly<Record<Rank, string>>> = {
  A: "o ás",
  J: "o valete",
  Q: "a dama",
  K: "o rei",
}

export const rankLabel = (rank: Rank): string => RANK_NAMES[rank] ?? `o ${rank}`

export const cardName = (card: Card): string =>
  `${rankLabel(rankOf(card))} de ${SUIT_NAMES[suitOf(card)]}`

export const cardCount = (count: number): string => (count === 1 ? "1 carta" : `${count} cartas`)

export const listNames = (names: readonly string[]): string =>
  names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`

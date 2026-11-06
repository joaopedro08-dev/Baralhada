import { rankOf, suitOf } from "../../cards/card.js"
import type { Card, Rank, Suit } from "../../cards/card.js"

export const TRUCO_RANKS = [
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
] as const satisfies readonly Rank[]
export const MANILHA_SUITS = ["D", "S", "H", "C"] as const satisfies readonly Suit[]

export type TrucoRank = (typeof TRUCO_RANKS)[number]
export type ManilhaSuit = (typeof MANILHA_SUITS)[number]

const MANILHA_BASE = TRUCO_RANKS.length

export const createTrucoDeck = (): readonly Card[] =>
  TRUCO_RANKS.flatMap((rank) => MANILHA_SUITS.map((suit): Card => `${rank}${suit}`))

export const isTrucoCard = (card: Card): boolean =>
  (TRUCO_RANKS as readonly Rank[]).includes(rankOf(card))

export const trucoRankOf = (card: Card): TrucoRank => rankOf(card) as TrucoRank

export const manilhaOf = (vira: Card): TrucoRank => {
  const position = TRUCO_RANKS.indexOf(trucoRankOf(vira))
  return TRUCO_RANKS[(position + 1) % TRUCO_RANKS.length] as TrucoRank
}

export const isManilha = (card: Card, manilha: TrucoRank): boolean => trucoRankOf(card) === manilha

export const strengthOf = (card: Card, manilha: TrucoRank): number =>
  isManilha(card, manilha)
    ? MANILHA_BASE + MANILHA_SUITS.indexOf(suitOf(card) as ManilhaSuit)
    : TRUCO_RANKS.indexOf(trucoRankOf(card))

export const MAX_STRENGTH = MANILHA_BASE + MANILHA_SUITS.length - 1

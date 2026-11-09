import { rankOf } from "../../cards/card.js"
import type { Card, Rank } from "../../cards/card.js"
import type { Hand } from "./model.js"

export const TWENTY_ONE = 21
export const DEALER_STANDS_AT = 17

const ACE_BONUS = 10
const FACE_VALUE = 10

export interface Score {
  readonly total: number
  readonly soft: boolean
}

export const cardValue = (card: Card): number => {
  const rank: Rank = rankOf(card)
  if (rank === "A") return 1
  if (rank === "J" || rank === "Q" || rank === "K") return FACE_VALUE
  return Number(rank)
}

export const scoreOf = (cards: readonly Card[]): Score => {
  const hard = cards.reduce((total, card) => total + cardValue(card), 0)
  const soft = cards.some((card) => rankOf(card) === "A") && hard + ACE_BONUS <= TWENTY_ONE
  return { total: soft ? hard + ACE_BONUS : hard, soft }
}

export const isNatural = (cards: readonly Card[]): boolean =>
  cards.length === 2 && scoreOf(cards).total === TWENTY_ONE

export const isBlackjackHand = (hand: Hand): boolean => !hand.fromSplit && isNatural(hand.cards)

export const isBust = (cards: readonly Card[]): boolean => scoreOf(cards).total > TWENTY_ONE

export const dealerKeepsDrawing = (cards: readonly Card[]): boolean =>
  scoreOf(cards).total < DEALER_STANDS_AT

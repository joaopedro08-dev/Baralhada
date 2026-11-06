import { createFullDeck } from "../../cards/card.js"
import type { Card } from "../../cards/card.js"
import { bestHand, HAND_CATEGORIES } from "./hand-ranking.js"
import type { HandCategory } from "./hand-ranking.js"
import { BOARD_SIZE } from "./model.js"
import type { PokerView } from "./player-view.js"

export interface CurrentHand {
  readonly category: HandCategory
  readonly cards: readonly Card[]
}

export interface OutsByCategory {
  readonly category: HandCategory
  readonly count: number
}

export interface Outs {
  readonly total: number
  readonly unseen: number
  readonly byCategory: readonly OutsByCategory[]
}

export interface PokerHints {
  readonly current: CurrentHand | null
  readonly outs: Outs | null
}

const strength = (category: HandCategory): number => HAND_CATEGORIES.indexOf(category)

const cardsToCome = (board: readonly Card[]): boolean =>
  board.length >= BOARD_SIZE.flop && board.length < BOARD_SIZE.river

const outsOf = (known: readonly Card[], current: HandCategory): Outs => {
  const unseen = createFullDeck().filter((card) => !known.includes(card))
  const reached = unseen
    .map((card) => bestHand([...known, card]).category)
    .filter((category) => strength(category) > strength(current))
  const byCategory = HAND_CATEGORIES.map((category) => ({
    category,
    count: reached.filter((found) => found === category).length,
  }))
    .filter((entry) => entry.count > 0)
    .reverse()
  return { total: reached.length, unseen: unseen.length, byCategory }
}

export const computePokerHints = (view: PokerView): PokerHints => {
  if (view.hole.length === 0) return { current: null, outs: null }
  const known = [...view.hole, ...view.board]
  const hand = bestHand(known)
  return {
    current: { category: hand.category, cards: hand.cards },
    outs: cardsToCome(view.board) ? outsOf(known, hand.category) : null,
  }
}

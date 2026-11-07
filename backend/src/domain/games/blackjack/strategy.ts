import { rankOf } from "../../cards/card.js"
import type { Card, Rank } from "../../cards/card.js"
import type { BlackjackAction } from "./actions.js"
import type { BlackjackHandView, BlackjackMoves, BlackjackView } from "./player-view.js"
import { cardValue } from "./scoring.js"

export type Play = "hit" | "stand" | "double" | "split"

export interface BlackjackAdvice {
  readonly action: BlackjackAction
  readonly play: Play
  readonly total: number
  readonly soft: boolean
  readonly pair: Rank | null
  readonly dealerUp: Card
}

export interface BlackjackHints {
  readonly advice: BlackjackAdvice | null
}

const ACE_UP = 11
const WEAK_DEALER_MAX = 6

const between = (value: number, low: number, high: number): boolean => value >= low && value <= high

export const dealerUpValue = (card: Card): number =>
  rankOf(card) === "A" ? ACE_UP : cardValue(card)

export const isWeakDealer = (up: number): boolean => between(up, 2, WEAK_DEALER_MAX)

const SPLITS: Partial<Readonly<Record<Rank, (up: number) => boolean>>> = {
  A: () => true,
  "8": () => true,
  "9": (up) => up !== 7 && up < 10,
  "7": (up) => up <= 7,
  "6": (up) => up <= 6,
  "4": (up) => between(up, 5, 6),
  "3": (up) => up <= 7,
  "2": (up) => up <= 7,
}

const pairPlay = (rank: Rank, up: number): Play | null => (SPLITS[rank]?.(up) ? "split" : null)

const softPlay = (total: number, up: number): Play => {
  if (total >= 19) return "stand"
  if (total === 18) {
    if (between(up, 3, 6)) return "double"
    return up <= 8 ? "stand" : "hit"
  }
  if (total === 17) return between(up, 3, 6) ? "double" : "hit"
  if (total >= 15) return between(up, 4, 6) ? "double" : "hit"
  return between(up, 5, 6) ? "double" : "hit"
}

const hardPlay = (total: number, up: number): Play => {
  if (total >= 17) return "stand"
  if (total >= 13) return isWeakDealer(up) ? "stand" : "hit"
  if (total === 12) return between(up, 4, 6) ? "stand" : "hit"
  if (total === 11) return up <= 10 ? "double" : "hit"
  if (total === 10) return up <= 9 ? "double" : "hit"
  if (total === 9) return between(up, 3, 6) ? "double" : "hit"
  return "hit"
}

const ACTIONS: Readonly<Record<Play, BlackjackAction>> = {
  hit: { type: "hit" },
  stand: { type: "stand" },
  double: { type: "double" },
  split: { type: "split" },
}

const TEN_VALUE = 10

const pairOf = (cards: readonly Card[]): Rank | null => {
  const [first, second] = cards
  if (cards.length !== 2 || !first || !second) return null
  if (cardValue(first) !== cardValue(second)) return null
  return cardValue(first) === TEN_VALUE ? "10" : rankOf(first)
}

const withoutDouble = (hand: BlackjackHandView): Play =>
  hand.soft && hand.total >= 18 ? "stand" : "hit"

const playFor = (hand: BlackjackHandView, moves: BlackjackMoves, up: number): Play => {
  const pair = pairOf(hand.cards)
  const splitting = pair && moves.split ? pairPlay(pair, up) : null
  const base = splitting ?? (hand.soft ? softPlay(hand.total, up) : hardPlay(hand.total, up))
  return base === "double" && !moves.double ? withoutDouble(hand) : base
}

export const computeBlackjackHints = (view: BlackjackView): BlackjackHints => {
  const seat = view.players.find((player) => player.id === view.viewerId)
  const hand = seat?.hands[view.handIndex]
  const dealerUp = view.dealer.cards[0]
  if (!view.moves.hit || !hand || !dealerUp) return { advice: null }
  const play = playFor(hand, view.moves, dealerUpValue(dealerUp))
  return {
    advice: {
      action: ACTIONS[play],
      play,
      total: hand.total,
      soft: hand.soft,
      pair: play === "split" ? pairOf(hand.cards) : null,
      dealerUp,
    },
  }
}

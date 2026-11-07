import { RANKS, rankOf, suitOf } from "../../cards/card.js"
import type { Card, Rank } from "../../cards/card.js"
import { withoutOne } from "./model.js"
import type { Meld } from "./model.js"
import type { CachetaAction } from "./actions.js"
import { findKnock, handSolver, isWild } from "./melds.js"
import type { Arrangement, HandSolver, Knock } from "./melds.js"
import type { CachetaView } from "./player-view.js"

export type CachetaAdvice =
  "knock" | "knockClean" | "takeJoker" | "takeForMeld" | "draw" | "discard"

export interface CachetaSuggestion {
  readonly action: CachetaAction
  readonly advice: CachetaAdvice
  readonly card: Card | null
}

export interface CachetaHints {
  readonly ready: readonly Meld[]
  readonly knock: Knock | null
  readonly suggestions: readonly CachetaSuggestion[]
}

const MELD_WEIGHT = 100
const NEIGHBOR_WEIGHT = 12
const WILD_KEEP = 1000
const SEQUENCE_REACH = 2

const looseCards = (cards: readonly Card[], arrangement: Arrangement): readonly Card[] =>
  arrangement.melds
    .flatMap((meld) => meld.cards)
    .reduce<readonly Card[]>((rest, card) => withoutOne(rest, card) ?? rest, cards)

const areNeighbors = (first: Card, second: Card): boolean => {
  if (rankOf(first) === rankOf(second)) return suitOf(first) !== suitOf(second)
  if (suitOf(first) !== suitOf(second)) return false
  const gap = Math.abs(RANKS.indexOf(rankOf(first)) - RANKS.indexOf(rankOf(second)))
  return gap <= SEQUENCE_REACH
}

const potentialOf = (cards: readonly Card[], cover: Arrangement): number => {
  const loose = looseCards(cards, cover)
  const linked = loose.filter((card, index) =>
    loose.some((other, otherIndex) => otherIndex !== index && areNeighbors(card, other))
  ).length
  return cover.covered * MELD_WEIGHT + linked * NEIGHBOR_WEIGHT - cover.jokers
}

const discardChoice = (hand: readonly Card[], solver: HandSolver, wildRank: Rank): Card | null => {
  const score = (card: Card): number => {
    const rest = withoutOne(hand, card) ?? hand
    const cover = solver.cover(solver.full ^ solver.bitOf(card))
    return potentialOf(rest, cover) - (isWild(card, wildRank) ? WILD_KEEP : 0)
  }
  return [...new Set(hand)].reduce<Card | null>(
    (best, card) => (best === null || score(card) > score(best) ? card : best),
    null
  )
}

const pickSuggestion = (view: CachetaView): CachetaSuggestion => {
  const top = view.discardTop
  if (top && view.moves.take) {
    if (isWild(top, view.wildRank)) {
      return { action: { type: "take" }, advice: "takeJoker", card: top }
    }
    const solver = handSolver([...view.hand, top], view.wildRank)
    const gain =
      solver.cover(solver.full).covered - solver.cover(solver.full ^ solver.bitOf(top)).covered
    if (gain > 0) return { action: { type: "take" }, advice: "takeForMeld", card: top }
  }
  return { action: { type: "draw" }, advice: "draw", card: null }
}

const closingSuggestions = (
  view: CachetaView,
  knock: Knock | null,
  solver: HandSolver
): readonly CachetaSuggestion[] => {
  const knocking: readonly CachetaSuggestion[] = knock
    ? [
        {
          action: { type: "knock", card: knock.discard },
          advice: knock.clean ? "knockClean" : "knock",
          card: knock.discard,
        },
      ]
    : []
  const card = knock ? null : discardChoice(view.hand, solver, view.wildRank)
  return card
    ? [...knocking, { action: { type: "discard", card }, advice: "discard", card }]
    : knocking
}

export const computeCachetaHints = (view: CachetaView): CachetaHints => {
  const solver = handSolver(view.hand, view.wildRank)
  const knock = view.moves.knock ? findKnock(view.hand, view.wildRank, solver) : null
  const suggestions = view.moves.draw
    ? [pickSuggestion(view)]
    : view.moves.discard
      ? closingSuggestions(view, knock, solver)
      : []
  return { ready: solver.cover(solver.full).melds, knock, suggestions }
}

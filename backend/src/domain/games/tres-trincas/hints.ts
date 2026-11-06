import { COPIES_PER_RANK, RANKS, rankOf } from "../../cards/card.js"
import type { Card, Rank } from "../../cards/card.js"
import type { TrincaAction } from "./actions.js"
import { SETS_TO_WIN } from "./model.js"
import type { CardSet } from "./model.js"
import type { TrincaView } from "./player-view.js"
import { findSets, isDead, isWild, setRankOf } from "./sets.js"
import type { Jokers } from "./sets.js"

export type CardRole = "natural" | "wild" | "dead"

export interface HandGroup {
  readonly rank: Rank
  readonly role: CardRole
  readonly cards: readonly Card[]
}

export type TrincaAdvice =
  "meldOne" | "meldTwo" | "meldLast" | "draw" | "discardDead" | "discardLoose" | "discardKeepingSet"

export interface TrincaSuggestion {
  readonly action: TrincaAction
  readonly advice: TrincaAdvice
  readonly ranks: readonly Rank[]
}

export interface TrincaHints {
  readonly groups: readonly HandGroup[]
  readonly ready: readonly CardSet[]
  readonly suggestions: readonly TrincaSuggestion[]
}

const SET_WEIGHT = 100
const DEAD_BONUS = 60
const WILD_PENALTY = 40
const GROUP_PENALTY = 10

const ROLE_ORDER: Readonly<Record<CardRole, number>> = { natural: 0, wild: 1, dead: 2 }

const roleOf = (card: Card, jokers: Jokers): CardRole => {
  if (isDead(card, jokers)) return "dead"
  return isWild(card, jokers) ? "wild" : "natural"
}

const groupHand = (hand: readonly Card[], jokers: Jokers): readonly HandGroup[] =>
  RANKS.map((rank) => hand.filter((card) => rankOf(card) === rank))
    .filter((cards) => cards.length > 0)
    .map((cards) => {
      const first = cards[0] as Card
      return { rank: rankOf(first), role: roleOf(first, jokers), cards }
    })
    .sort(
      (first, second) =>
        ROLE_ORDER[first.role] - ROLE_ORDER[second.role] ||
        second.cards.length - first.cards.length ||
        RANKS.indexOf(first.rank) - RANKS.indexOf(second.rank)
    )

const visibleCards = (view: TrincaView): readonly Card[] => [
  ...view.hand,
  ...view.players.flatMap((player) => player.sets.flat()),
  view.vira,
  ...(view.discardTop ? [view.discardTop] : []),
]

const discardChoice = (view: TrincaView, jokers: Jokers): Card | null => {
  const visible = visibleCards(view)
  const unseen = (rank: Rank) =>
    COPIES_PER_RANK - visible.filter((card) => rankOf(card) === rank).length
  const score = (card: Card): number => {
    const rest = view.hand.filter((held) => held !== card)
    const twins = view.hand.filter((held) => rankOf(held) === rankOf(card)).length
    return (
      findSets(rest, jokers).length * SET_WEIGHT +
      (isDead(card, jokers) ? DEAD_BONUS : 0) -
      (isWild(card, jokers) ? WILD_PENALTY : 0) -
      twins * GROUP_PENALTY -
      unseen(rankOf(card))
    )
  }
  return view.hand.reduce<Card | null>(
    (best, card) => (best === null || score(card) > score(best) ? card : best),
    null
  )
}

const meldSuggestion = (
  view: TrincaView,
  ready: readonly CardSet[],
  jokers: Jokers
): TrincaSuggestion | null => {
  const sets = ready.slice(0, view.moves.meldLimit)
  if (sets.length === 0) return null
  const melded = view.players.find((player) => player.id === view.viewerId)?.sets.length ?? 0
  const advice: TrincaAdvice =
    sets.length > 1 ? "meldTwo" : melded === SETS_TO_WIN - 1 ? "meldLast" : "meldOne"
  return {
    action: { type: "meld", cards: sets.flat() },
    advice,
    ranks: sets.map((set) => setRankOf(set, jokers)),
  }
}

const discardSuggestion = (
  view: TrincaView,
  ready: readonly CardSet[],
  jokers: Jokers
): TrincaSuggestion | null => {
  const card = discardChoice(view, jokers)
  if (!card) return null
  const advice: TrincaAdvice = isDead(card, jokers)
    ? "discardDead"
    : ready.length > 0 && view.moves.meldLimit === 0
      ? "discardKeepingSet"
      : "discardLoose"
  return { action: { type: "discard", card }, advice, ranks: [rankOf(card)] }
}

const DRAW: TrincaSuggestion = { action: { type: "draw" }, advice: "draw", ranks: [] }

const suggestionsOf = (
  view: TrincaView,
  ready: readonly CardSet[],
  jokers: Jokers
): readonly TrincaSuggestion[] => {
  const meld = meldSuggestion(view, ready, jokers)
  const next = view.moves.draw
    ? DRAW
    : view.moves.discard
      ? discardSuggestion(view, ready, jokers)
      : null
  return [meld, next].filter((suggestion) => suggestion !== null)
}

export const computeTrincaHints = (view: TrincaView): TrincaHints => {
  const jokers: Jokers = { dead: view.deadRank, wild: view.wildRank }
  const ready = findSets(view.hand, jokers)
  return {
    groups: groupHand(view.hand, jokers),
    ready,
    suggestions: suggestionsOf(view, ready, jokers),
  }
}

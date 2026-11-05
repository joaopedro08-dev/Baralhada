import { COPIES_PER_RANK, RANKS, rankOf } from "../../cards/card.js"
import type { Card, Rank } from "../../cards/card.js"
import type { PlayerId } from "./model.js"
import type { PlayerView, PublicPlayer } from "./player-view.js"
import type { CardPlay, TurnAction, TurnActionKind } from "./turn-actions.js"

export interface Play {
  readonly action: TurnAction
  readonly kind: TurnActionKind
  readonly rank: Rank | null
  readonly targetId: PlayerId | null
  readonly gainedCards: number
  readonly score: number
}

export interface RiskAlert {
  readonly rank: Rank
  readonly pileSize: number
  readonly unseenCards: number
}

export interface CardCount {
  readonly rank: Rank
  readonly visible: number
  readonly missing: number
}

export interface Hints {
  readonly plays: readonly Play[]
  readonly highlights: {
    readonly handCards: readonly Card[]
    readonly tableCards: readonly Card[]
    readonly piles: readonly PlayerId[]
  }
  readonly risk: RiskAlert | null
  readonly cardCounts: readonly CardCount[]
}

const POINTS_PER_CARD = 10
const POINTS_PER_STOLEN_CARD = 10
const EXPOSURE_PER_CARD = 6
const DISCARD_EXPOSURE = 4
const DISCARD_MATCHING_TABLE_PENALTY = 8
const DISCARD_HELD_PAIR_BONUS = 3
const DRAW_SCORE = 4

interface Context {
  readonly view: PlayerView
  readonly viewer: PublicPlayer | undefined
  readonly unseen: (rank: Rank) => number
}

const countByRank = (cards: readonly Card[]): Map<Rank, number> => {
  const counts = new Map<Rank, number>()
  for (const card of cards) {
    const rank = rankOf(card)
    counts.set(rank, (counts.get(rank) ?? 0) + 1)
  }
  return counts
}

const seenCounts = (
  view: PlayerView,
  ranksInPiles: ReadonlyMap<Rank, number>
): ReadonlyMap<Rank, number> => {
  const seen = countByRank([...view.hand, ...view.table])
  for (const [rank, count] of ranksInPiles) seen.set(rank, (seen.get(rank) ?? 0) + count)
  return seen
}

const exposure = (context: Context, rank: Rank, pileSize: number): number =>
  (pileSize * context.unseen(rank) * EXPOSURE_PER_CARD) / COPIES_PER_RANK

const currentExposure = (context: Context): number => {
  const top = context.viewer?.pileTop
  return top ? exposure(context, rankOf(top), context.viewer?.pileSize ?? 0) : 0
}

const scoringPlay = (
  context: Context,
  action: CardPlay,
  targetId: PlayerId | null,
  gainedCards: number,
  stolenCards: number
): Play => {
  const rank = rankOf(action.card)
  const pileAfter = (context.viewer?.pileSize ?? 0) + gainedCards
  const risk = exposure(context, rank, pileAfter) - currentExposure(context)
  return {
    action,
    kind: action.type,
    rank,
    targetId,
    gainedCards,
    score: gainedCards * POINTS_PER_CARD + stolenCards * POINTS_PER_STOLEN_CARD - risk,
  }
}

const playsWith = (context: Context, card: Card): readonly Play[] => {
  const { view, viewer } = context
  const rank = rankOf(card)
  const plays: Play[] = []
  const tableCards = view.table.filter((onTable) => rankOf(onTable) === rank)
  if (tableCards.length > 0) {
    const action: CardPlay = { type: "capture", card, tableCards }
    plays.push(scoringPlay(context, action, null, tableCards.length + 1, 0))
  }
  if (viewer?.pileTop && rankOf(viewer.pileTop) === rank) {
    plays.push(scoringPlay(context, { type: "stack", card }, null, 1, 0))
  }
  for (const target of view.players) {
    if (target.id === view.viewerId || !target.pileTop || rankOf(target.pileTop) !== rank) continue
    const action: CardPlay = { type: "steal", card, targetId: target.id }
    plays.push(scoringPlay(context, action, target.id, target.pileSize + 1, target.pileSize))
  }
  return plays
}

const discardPlay = (context: Context, card: Card): Play => {
  const rank = rankOf(card)
  const held = context.view.hand.filter((inHand) => rankOf(inHand) === rank).length
  const onTable = context.view.table.some((inTable) => rankOf(inTable) === rank)
  return {
    action: { type: "discard", card },
    kind: "discard",
    rank,
    targetId: null,
    gainedCards: 0,
    score:
      (held - 1) * DISCARD_HELD_PAIR_BONUS -
      context.unseen(rank) * DISCARD_EXPOSURE -
      (onTable ? DISCARD_MATCHING_TABLE_PENALTY : 0),
  }
}

const oneCardPerRank = (hand: readonly Card[]): readonly Card[] => [
  ...new Map(hand.map((card) => [rankOf(card), card])).values(),
]

const turnPlay = (action: TurnAction, score: number): Play => ({
  action,
  kind: action.type,
  rank: null,
  targetId: null,
  gainedCards: 0,
  score,
})

const availablePlays = (context: Context): readonly Play[] => {
  const { view } = context
  if (view.currentPlayerId !== view.viewerId || view.endReason !== null) return []
  if (view.canPass) return [turnPlay({ type: "pass" }, 0)]
  const cards = oneCardPerRank(view.hand)
  const mayDraw = !view.drewThisTurn && view.deckSize > 0
  return [
    ...cards.flatMap((card) => playsWith(context, card)),
    ...cards.map((card) => discardPlay(context, card)),
    ...(mayDraw ? [turnPlay({ type: "draw" }, DRAW_SCORE)] : []),
  ].toSorted((first, second) => second.score - first.score)
}

const SCORING_KINDS: ReadonlySet<TurnActionKind> = new Set(["capture", "stack", "steal"])

const highlightsOf = (view: PlayerView, plays: readonly Play[]): Hints["highlights"] => {
  const scoring = plays.filter((play) => SCORING_KINDS.has(play.kind))
  const ranks = new Set(scoring.map((play) => play.rank))
  const piles = new Set<PlayerId>()
  for (const play of scoring) {
    if (play.kind === "stack") piles.add(view.viewerId)
    if (play.targetId) piles.add(play.targetId)
  }
  return {
    handCards: view.hand.filter((card) => ranks.has(rankOf(card))),
    tableCards: scoring.flatMap((play) =>
      play.action.type === "capture" ? play.action.tableCards : []
    ),
    piles: [...piles],
  }
}

const riskOf = (context: Context): RiskAlert | null => {
  const top = context.viewer?.pileTop
  if (!top) return null
  const rank = rankOf(top)
  const unseenCards = context.unseen(rank)
  return unseenCards > 0 ? { rank, pileSize: context.viewer?.pileSize ?? 0, unseenCards } : null
}

export const computeHints = (view: PlayerView, ranksInPiles: ReadonlyMap<Rank, number>): Hints => {
  const seen = seenCounts(view, ranksInPiles)
  const context: Context = {
    view,
    viewer: view.players.find((player) => player.id === view.viewerId),
    unseen: (rank) => Math.max(0, COPIES_PER_RANK - (seen.get(rank) ?? 0)),
  }
  const plays = availablePlays(context)
  return {
    plays,
    highlights: highlightsOf(view, plays),
    risk: riskOf(context),
    cardCounts: RANKS.map((rank) => {
      const visible = seen.get(rank) ?? 0
      return { rank, visible, missing: COPIES_PER_RANK - visible }
    }),
  }
}

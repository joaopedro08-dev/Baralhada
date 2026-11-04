import { QUAD_SIZE, RANKS, rankOf } from "../cards/card.js"
import type { Card, Rank } from "../cards/card.js"
import type { PlayerId, TurnActionKind } from "./model.js"
import type { PlayerView } from "./player-view.js"
import type { TurnAction } from "./turn-actions.js"

export type PlayKind = "complete" | "steal" | "advance" | "open" | "draw" | "discard"

export interface Play {
  readonly action: TurnAction
  readonly kind: PlayKind
  readonly rank: Rank | null
  readonly targetId: PlayerId | null
  readonly score: number
}

export interface RiskAlert {
  readonly rank: Rank
  readonly cardsInMeld: number
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
    readonly stealableMelds: readonly { readonly playerId: PlayerId; readonly rank: Rank }[]
  }
  readonly risks: readonly RiskAlert[]
  readonly cardCounts: readonly CardCount[]
}

const COMPLETION_BONUS = 100
const STEAL_BONUS = 30
const TABLE_BONUS = 5
const POINTS_PER_CARD = 10
const DRAW_SCORE = 15
const DISCARD_BASE_SCORE = 10
const DISCARD_PAIR_PENALTY = 3

const countVisibleCards = (view: PlayerView): ReadonlyMap<Rank, number> => {
  const counts = new Map<Rank, number>()
  const add = (card: Card) => {
    const rank = rankOf(card)
    counts.set(rank, (counts.get(rank) ?? 0) + 1)
  }
  view.hand.forEach(add)
  view.table.forEach(add)
  view.players.forEach((player) => player.melds.forEach((meld) => meld.cards.forEach(add)))
  return counts
}

const cardsOfRank = (cards: readonly Card[], rank: Rank): readonly Card[] =>
  cards.filter((card) => rankOf(card) === rank)

const ownMeldSize = (view: PlayerView, rank: Rank): number =>
  view.players
    .find((player) => player.id === view.viewerId)
    ?.melds.find((meld) => meld.rank === rank)?.cards.length ?? 0

const buildKind = (size: number, opening: boolean): PlayKind => {
  if (size === QUAD_SIZE) return "complete"
  return opening ? "open" : "advance"
}

const scoreBySize = (size: number, bonus: number): number =>
  size * POINTS_PER_CARD + bonus + (size === QUAD_SIZE ? COMPLETION_BONUS : 0)

const handRanks = (view: PlayerView): readonly Rank[] => [...new Set(view.hand.map(rankOf))]

const layDownPlays = (view: PlayerView): readonly Play[] =>
  handRanks(view).flatMap((rank) => {
    const cards = cardsOfRank(view.hand, rank)
    const existing = ownMeldSize(view, rank)
    const size = existing + cards.length
    if (size < 2) return []
    return [
      {
        action: { type: "layDown", cards },
        kind: buildKind(size, existing === 0),
        rank,
        targetId: null,
        score: scoreBySize(size, 0),
      } satisfies Play,
    ]
  })

const takeFromTablePlays = (view: PlayerView): readonly Play[] =>
  handRanks(view).flatMap((rank) => {
    const tableCards = cardsOfRank(view.table, rank)
    if (tableCards.length === 0) return []
    const handCards = cardsOfRank(view.hand, rank)
    const existing = ownMeldSize(view, rank)
    const size = existing + handCards.length + tableCards.length
    return [
      {
        action: { type: "takeFromTable", tableCards, handCards },
        kind: buildKind(size, existing === 0),
        rank,
        targetId: null,
        score: scoreBySize(size, TABLE_BONUS),
      } satisfies Play,
    ]
  })

const stealPlays = (view: PlayerView): readonly Play[] =>
  view.players
    .filter((player) => player.id !== view.viewerId)
    .flatMap((player) =>
      player.melds
        .filter((meld) => meld.cards.length < QUAD_SIZE)
        .flatMap((meld) => {
          const handCards = cardsOfRank(view.hand, meld.rank)
          const existing = ownMeldSize(view, meld.rank)
          if (handCards.length === 0 && existing === 0) return []
          const size = existing + meld.cards.length + handCards.length
          return [
            {
              action: { type: "steal", targetId: player.id, rank: meld.rank, handCards },
              kind: size === QUAD_SIZE ? "complete" : "steal",
              rank: meld.rank,
              targetId: player.id,
              score: scoreBySize(size, STEAL_BONUS),
            } satisfies Play,
          ]
        })
    )

const drawPlays = (view: PlayerView): readonly Play[] =>
  view.deckSize > 0
    ? [{ action: { type: "draw" }, kind: "draw", rank: null, targetId: null, score: DRAW_SCORE }]
    : []

const discardPlays = (view: PlayerView, visible: ReadonlyMap<Rank, number>): readonly Play[] =>
  view.hand.map((card) => {
    const rank = rankOf(card)
    const unseen = QUAD_SIZE - (visible.get(rank) ?? 0)
    const pairs = cardsOfRank(view.hand, rank).length - 1
    return {
      action: { type: "discard", card },
      kind: "discard",
      rank,
      targetId: null,
      score: DISCARD_BASE_SCORE - pairs * DISCARD_PAIR_PENALTY - unseen,
    }
  })

const isPlayAvailable = (kind: TurnActionKind, usedActions: readonly TurnActionKind[]): boolean => {
  if (usedActions.length === 0) return true
  const closesPurchase = kind === "discard" || kind === "takeFromTable"
  return closesPurchase && usedActions.length === 1 && usedActions[0] === "draw"
}

const availablePlays = (view: PlayerView, visible: ReadonlyMap<Rank, number>): readonly Play[] => {
  if (view.currentPlayerId !== view.viewerId || view.endReason !== null) return []
  const generators: readonly (readonly [TurnActionKind, () => readonly Play[]])[] = [
    ["layDown", () => layDownPlays(view)],
    ["takeFromTable", () => takeFromTablePlays(view)],
    ["steal", () => stealPlays(view)],
    ["draw", () => drawPlays(view)],
    ["discard", () => discardPlays(view, visible)],
  ]
  return generators
    .filter(([kind]) => isPlayAvailable(kind, view.usedActions))
    .flatMap(([, generate]) => generate())
    .toSorted((first, second) => second.score - first.score)
}

const highlightsOf = (plays: readonly Play[]): Hints["highlights"] => {
  const handCards = new Set<Card>()
  const tableCards = new Set<Card>()
  const stealableMelds: { playerId: PlayerId; rank: Rank }[] = []
  for (const { action } of plays) {
    if (action.type === "layDown") action.cards.forEach((card) => handCards.add(card))
    if (action.type === "takeFromTable") {
      action.tableCards.forEach((card) => tableCards.add(card))
      action.handCards.forEach((card) => handCards.add(card))
    }
    if (action.type === "steal") {
      stealableMelds.push({ playerId: action.targetId, rank: action.rank })
      action.handCards.forEach((card) => handCards.add(card))
    }
  }
  return { handCards: [...handCards], tableCards: [...tableCards], stealableMelds }
}

const risksOf = (view: PlayerView, visible: ReadonlyMap<Rank, number>): readonly RiskAlert[] =>
  (view.players.find((player) => player.id === view.viewerId)?.melds ?? [])
    .filter((meld) => meld.cards.length < QUAD_SIZE)
    .map((meld) => ({
      rank: meld.rank,
      cardsInMeld: meld.cards.length,
      unseenCards: QUAD_SIZE - (visible.get(meld.rank) ?? 0),
    }))
    .filter((risk) => risk.unseenCards > 0)

export const computeHints = (view: PlayerView): Hints => {
  const visible = countVisibleCards(view)
  const plays = availablePlays(view, visible)
  return {
    plays,
    highlights: highlightsOf(plays),
    risks: risksOf(view, visible),
    cardCounts: RANKS.map((rank) => {
      const seen = visible.get(rank) ?? 0
      return { rank, visible: seen, missing: QUAD_SIZE - seen }
    }),
  }
}

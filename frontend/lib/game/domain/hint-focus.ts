import type { Card, Hints, PlayerId, TurnAction } from "@/lib/game/domain/types"

export type HintLevel = "best" | "possible" | null

interface BestPlay {
  readonly card: Card | null
  readonly tableCards: readonly Card[]
  readonly pile: PlayerId | null
}

export interface HintFocus {
  readonly best: BestPlay
  readonly possible: Hints["highlights"]
}

export const NO_FOCUS: HintFocus = {
  best: { card: null, tableCards: [], pile: null },
  possible: { handCards: [], tableCards: [], piles: [] },
}

const bestPlayOf = (action: TurnAction, viewerId: PlayerId): BestPlay => {
  switch (action.type) {
    case "capture":
      return { card: action.card, tableCards: action.tableCards, pile: null }
    case "stack":
      return { card: action.card, tableCards: [], pile: viewerId }
    case "steal":
      return { card: action.card, tableCards: [], pile: action.targetId }
    case "discard":
      return { card: action.card, tableCards: [], pile: null }
  }
}

export const focusOfHints = (
  hints: Hints | null,
  viewerId: PlayerId
): HintFocus => {
  const best = hints?.plays[0]
  if (!hints || !best) return NO_FOCUS
  return { best: bestPlayOf(best.action, viewerId), possible: hints.highlights }
}

const levelOf = (isBest: boolean, isPossible: boolean): HintLevel => {
  if (isBest) return "best"
  return isPossible ? "possible" : null
}

export const handCardHint = (focus: HintFocus, card: Card): HintLevel =>
  levelOf(focus.best.card === card, focus.possible.handCards.includes(card))

export const tableCardHint = (focus: HintFocus, card: Card): HintLevel =>
  levelOf(
    focus.best.tableCards.includes(card),
    focus.possible.tableCards.includes(card)
  )

export const pileHint = (focus: HintFocus, ownerId: PlayerId): HintLevel =>
  levelOf(focus.best.pile === ownerId, focus.possible.piles.includes(ownerId))

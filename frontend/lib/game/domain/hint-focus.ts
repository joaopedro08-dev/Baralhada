import type { Card, Hints, PlayerId, TurnAction } from "@/lib/game/domain/types"

export type HintLevel = "best" | "possible" | null

interface BestPlay {
  readonly card: Card | null
  readonly tableCards: readonly Card[]
  readonly pile: PlayerId | null
  readonly draw: boolean
}

export interface HintFocus {
  readonly best: BestPlay
  readonly possible: Hints["highlights"]
}

const NO_BEST_PLAY: BestPlay = {
  card: null,
  tableCards: [],
  pile: null,
  draw: false,
}

export const NO_FOCUS: HintFocus = {
  best: NO_BEST_PLAY,
  possible: { handCards: [], tableCards: [], piles: [] },
}

const bestPlayOf = (action: TurnAction, viewerId: PlayerId): BestPlay => {
  switch (action.type) {
    case "capture":
      return {
        ...NO_BEST_PLAY,
        card: action.card,
        tableCards: action.tableCards,
      }
    case "stack":
      return { ...NO_BEST_PLAY, card: action.card, pile: viewerId }
    case "steal":
      return { ...NO_BEST_PLAY, card: action.card, pile: action.targetId }
    case "discard":
      return { ...NO_BEST_PLAY, card: action.card }
    case "draw":
      return { ...NO_BEST_PLAY, draw: true }
    case "pass":
      return NO_BEST_PLAY
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

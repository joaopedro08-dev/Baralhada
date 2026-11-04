import type {
  Card,
  Hints,
  MeldTarget,
  PlayerId,
  Rank,
  TurnAction,
} from "@/lib/game/domain/types"

export type HintLevel = "best" | "possible" | null

interface BestPlay {
  readonly draw: boolean
  readonly handCards: readonly Card[]
  readonly tableCards: readonly Card[]
  readonly meld: MeldTarget | null
}

export interface HintFocus {
  readonly best: BestPlay
  readonly possible: Hints["highlights"]
}

const NO_BEST_PLAY: BestPlay = {
  draw: false,
  handCards: [],
  tableCards: [],
  meld: null,
}

export const NO_FOCUS: HintFocus = {
  best: NO_BEST_PLAY,
  possible: { handCards: [], tableCards: [], stealableMelds: [] },
}

const bestPlayOf = (action: TurnAction): BestPlay => {
  switch (action.type) {
    case "draw":
      return { ...NO_BEST_PLAY, draw: true }
    case "layDown":
      return { ...NO_BEST_PLAY, handCards: action.cards }
    case "discard":
      return { ...NO_BEST_PLAY, handCards: [action.card] }
    case "takeFromTable":
      return {
        ...NO_BEST_PLAY,
        handCards: action.handCards,
        tableCards: action.tableCards,
      }
    case "steal":
      return {
        ...NO_BEST_PLAY,
        handCards: action.handCards,
        meld: { playerId: action.targetId, rank: action.rank },
      }
  }
}

export const focusOfHints = (hints: Hints | null): HintFocus => {
  const best = hints?.plays[0]
  if (!hints || !best) return NO_FOCUS
  return { best: bestPlayOf(best.action), possible: hints.highlights }
}

const levelOf = (isBest: boolean, isPossible: boolean): HintLevel => {
  if (isBest) return "best"
  return isPossible ? "possible" : null
}

export const handCardHint = (focus: HintFocus, card: Card): HintLevel =>
  levelOf(
    focus.best.handCards.includes(card),
    focus.possible.handCards.includes(card)
  )

export const tableCardHint = (focus: HintFocus, card: Card): HintLevel =>
  levelOf(
    focus.best.tableCards.includes(card),
    focus.possible.tableCards.includes(card)
  )

export const meldHint = (
  focus: HintFocus,
  playerId: PlayerId,
  rank: Rank
): HintLevel =>
  levelOf(
    focus.best.meld?.playerId === playerId && focus.best.meld.rank === rank,
    focus.possible.stealableMelds.some(
      (meld) => meld.playerId === playerId && meld.rank === rank
    )
  )

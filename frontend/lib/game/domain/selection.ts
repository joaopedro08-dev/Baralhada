import { isCompleteMeld, rankOf } from "@/lib/game/domain/cards"
import type {
  Card,
  GameState,
  MeldTarget,
  PlayerId,
  Rank,
  TurnAction,
  TurnActionKind,
} from "@/lib/game/domain/types"

export interface Selection {
  readonly turn: number
  readonly hand: readonly Card[]
  readonly tableCards: readonly Card[]
  readonly meld: MeldTarget | null
}

export type ActionPlan =
  | { readonly ready: true; readonly action: TurnAction }
  | { readonly ready: false; readonly problem: string }

export const emptySelection = (turn: number): Selection => ({
  turn,
  hand: [],
  tableCards: [],
  meld: null,
})

const isStealable = (game: GameState, target: MeldTarget | null): boolean => {
  if (!target) return false
  const owner = game.players.find((player) => player.id === target.playerId)
  return (
    owner?.melds.some(
      (meld) => meld.rank === target.rank && !isCompleteMeld(meld)
    ) ?? false
  )
}

export const currentSelection = (
  selection: Selection,
  game: GameState
): Selection => {
  if (selection.turn !== game.turnNumber) return emptySelection(game.turnNumber)
  const { tableCards, meld } = selection
  return {
    turn: selection.turn,
    hand: selection.hand.filter((card) => game.hand.includes(card)),
    tableCards: tableCards.filter((card) => game.table.includes(card)),
    meld: isStealable(game, meld) ? meld : null,
  }
}

const withoutRank = (cards: readonly Card[], rank: Rank): readonly Card[] =>
  cards.filter((card) => rankOf(card) !== rank)

const ofRank = (cards: readonly Card[], rank: Rank): readonly Card[] =>
  cards.filter((card) => rankOf(card) === rank)

export const toggleHandCard = (
  selection: Selection,
  card: Card
): Selection => ({
  ...selection,
  hand: selection.hand.includes(card)
    ? selection.hand.filter((held) => held !== card)
    : [...selection.hand, card],
})

export const toggleTableCard = (
  selection: Selection,
  card: Card,
  hand: readonly Card[]
): Selection => {
  const rank = rankOf(card)
  if (selection.tableCards.includes(card)) {
    const tableCards = selection.tableCards.filter((held) => held !== card)
    return {
      ...selection,
      tableCards,
      hand:
        tableCards.length > 0
          ? selection.hand
          : withoutRank(selection.hand, rank),
    }
  }
  const sameRank = ofRank(selection.tableCards, rank)
  return {
    ...selection,
    tableCards: [...sameRank, card],
    meld: null,
    hand: sameRank.length > 0 ? selection.hand : ofRank(hand, rank),
  }
}

const isSameTarget = (a: MeldTarget | null, b: MeldTarget): boolean =>
  a?.playerId === b.playerId && a.rank === b.rank

export const toggleMeld = (
  selection: Selection,
  target: MeldTarget,
  hand: readonly Card[]
): Selection => {
  const released = isSameTarget(selection.meld, target)
  return {
    ...selection,
    meld: released ? null : target,
    tableCards: [],
    hand: released
      ? withoutRank(selection.hand, target.rank)
      : ofRank(hand, target.rank),
  }
}

export const planAction = (
  kind: TurnActionKind,
  { hand, tableCards, meld }: Selection
): ActionPlan => {
  switch (kind) {
    case "draw":
      return { ready: true, action: { type: "draw" } }
    case "layDown":
      return { ready: true, action: { type: "layDown", cards: hand } }
    case "takeFromTable":
      return tableCards.length > 0
        ? {
            ready: true,
            action: { type: "takeFromTable", tableCards, handCards: hand },
          }
        : { ready: false, problem: "Toque nas cartas da mesa que quer pegar." }
    case "steal":
      return meld
        ? {
            ready: true,
            action: {
              type: "steal",
              targetId: meld.playerId,
              rank: meld.rank,
              handCards: hand,
            },
          }
        : {
            ready: false,
            problem: "Toque na quadra incompleta que quer roubar.",
          }
    case "discard": {
      const [card, ...others] = hand
      return card && others.length === 0
        ? { ready: true, action: { type: "discard", card } }
        : {
            ready: false,
            problem: "Selecione 1 carta da sua mão para descartar.",
          }
    }
  }
}

export const isActionOpen = (
  { usedActions }: GameState,
  kind: TurnActionKind
): boolean => {
  if (usedActions.length === 0) return true
  return (
    (kind === "discard" || kind === "takeFromTable") &&
    usedActions.length === 1 &&
    usedActions[0] === "draw"
  )
}

const holdsOpenMeld = (
  game: GameState,
  viewerId: PlayerId,
  rank: Rank
): boolean => {
  const melds = game.players.find((player) => player.id === viewerId)?.melds
  return (
    melds?.some((meld) => meld.rank === rank && !isCompleteMeld(meld)) ?? false
  )
}

export const suggestAction = (
  game: GameState,
  selection: Selection,
  viewerId: PlayerId,
  bestAction: TurnActionKind | null = null
): TurnActionKind | null => {
  const { hand, meld, tableCards } = selection
  if (game.usedActions.includes("draw")) {
    if (tableCards.length > 0 && hand.length > 0) return "takeFromTable"
    return hand.length === 0 && bestAction === "takeFromTable"
      ? "takeFromTable"
      : "discard"
  }
  if (meld && hand.length > 0) return "steal"
  if (meld && holdsOpenMeld(game, viewerId, meld.rank)) return "steal"
  if (tableCards.length > 0 && hand.length > 0) return "takeFromTable"
  if (hand.length >= 2) return "layDown"
  const [single] = hand
  if (single) {
    return holdsOpenMeld(game, viewerId, rankOf(single)) ? "layDown" : "discard"
  }
  if (tableCards.length > 0 || meld) return null
  if (bestAction) return bestAction
  return game.deckSize > 0 ? "draw" : null
}

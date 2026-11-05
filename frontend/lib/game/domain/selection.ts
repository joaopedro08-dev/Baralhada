import { sameRank, sortCards } from "@/lib/game/domain/cards"
import type {
  Card,
  GamePlayer,
  GameState,
  PlayerId,
  TurnAction,
  TurnActionKind,
} from "@/lib/game/domain/types"

export interface Selection {
  readonly turn: number
  readonly card: Card | null
  readonly tableCards: readonly Card[]
  readonly pile: PlayerId | null
}

export type ActionPlan =
  | { readonly ready: true; readonly action: TurnAction }
  | { readonly ready: false; readonly problem: string }

export const emptySelection = (turn: number): Selection => ({
  turn,
  card: null,
  tableCards: [],
  pile: null,
})

const pileTopOf = (game: GameState, ownerId: PlayerId | null): Card | null =>
  game.players.find((player) => player.id === ownerId)?.pileTop ?? null

const handCardMatching = (game: GameState, target: Card): Card | null =>
  sortCards(game.hand).find((card) => sameRank(card, target)) ?? null

const keepMatching = (card: Card | null, target: Card): Card | null =>
  card && sameRank(card, target) ? card : null

export const currentSelection = (
  selection: Selection,
  game: GameState
): Selection => {
  if (selection.turn !== game.turnNumber) return emptySelection(game.turnNumber)
  const { card, tableCards, pile } = selection
  return {
    turn: selection.turn,
    card: card && game.hand.includes(card) ? card : null,
    tableCards: tableCards.filter((onTable) => game.table.includes(onTable)),
    pile: pileTopOf(game, pile) ? pile : null,
  }
}

export const toggleHandCard = (
  selection: Selection,
  card: Card,
  game: GameState
): Selection => {
  if (selection.card === card) return { ...selection, card: null }
  const top = pileTopOf(game, selection.pile)
  return {
    ...selection,
    card,
    tableCards: selection.tableCards.filter((onTable) =>
      sameRank(onTable, card)
    ),
    pile: top && sameRank(top, card) ? selection.pile : null,
  }
}

export const toggleTableCard = (
  selection: Selection,
  card: Card,
  game: GameState
): Selection => {
  if (selection.tableCards.includes(card)) {
    return {
      ...selection,
      tableCards: selection.tableCards.filter((held) => held !== card),
    }
  }
  return {
    ...selection,
    card: keepMatching(selection.card, card) ?? handCardMatching(game, card),
    tableCards: [
      ...selection.tableCards.filter((held) => sameRank(held, card)),
      card,
    ],
    pile: null,
  }
}

export const togglePile = (
  selection: Selection,
  ownerId: PlayerId,
  game: GameState
): Selection => {
  const top = pileTopOf(game, ownerId)
  if (selection.pile === ownerId || !top) return { ...selection, pile: null }
  return {
    ...selection,
    card: keepMatching(selection.card, top) ?? handCardMatching(game, top),
    tableCards: [],
    pile: ownerId,
  }
}

export const planAction = (
  kind: TurnActionKind,
  { card, tableCards, pile }: Selection,
  viewerId: PlayerId
): ActionPlan => {
  if (!card) {
    return { ready: false, problem: "Selecione 1 carta da sua mão." }
  }
  switch (kind) {
    case "capture":
      return tableCards.length > 0
        ? { ready: true, action: { type: "capture", card, tableCards } }
        : {
            ready: false,
            problem: "Toque nas cartas da mesa que quer capturar.",
          }
    case "stack":
      return { ready: true, action: { type: "stack", card } }
    case "steal":
      return pile && pile !== viewerId
        ? { ready: true, action: { type: "steal", card, targetId: pile } }
        : {
            ready: false,
            problem: "Toque no monte do adversário que quer roubar.",
          }
    case "discard":
      return { ready: true, action: { type: "discard", card } }
  }
}

const hasPile = (player: GamePlayer): boolean => player.pileSize > 0

export const isActionAvailable = (
  game: GameState,
  viewerId: PlayerId,
  kind: TurnActionKind
): boolean => {
  if (game.hand.length === 0) return false
  switch (kind) {
    case "capture":
      return game.table.length > 0
    case "stack":
      return game.players.some(
        (player) => player.id === viewerId && hasPile(player)
      )
    case "steal":
      return game.players.some(
        (player) => player.id !== viewerId && hasPile(player)
      )
    case "discard":
      return true
  }
}

const matchesAny = (card: Card, others: readonly (Card | null)[]): boolean =>
  others.some((other) => other !== null && sameRank(card, other))

export const suggestAction = (
  game: GameState,
  selection: Selection,
  viewerId: PlayerId,
  bestAction: TurnActionKind | null = null
): TurnActionKind | null => {
  const { card, tableCards, pile } = selection
  if (pile) return pile === viewerId ? "stack" : "steal"
  if (tableCards.length > 0) return "capture"
  if (!card) return bestAction
  if (matchesAny(card, game.table)) return "capture"
  const opponentTops = game.players
    .filter((player) => player.id !== viewerId)
    .map((player) => player.pileTop)
  if (matchesAny(card, opponentTops)) return "steal"
  return matchesAny(card, [pileTopOf(game, viewerId)]) ? "stack" : "discard"
}

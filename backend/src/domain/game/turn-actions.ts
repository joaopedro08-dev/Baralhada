import { QUAD_SIZE, rankOf, shareRank } from "../cards/card.js"
import type { Card, Rank } from "../cards/card.js"
import { err, ok } from "../shared/result.js"
import type { Result } from "../shared/result.js"
import type { GameErrorCode } from "./errors.js"
import {
  appendEvents,
  findPlayer,
  findWinnerIds,
  getPlayer,
  isComplete,
  isEveryQuadComplete,
  isFinished,
  replacePlayer,
} from "./model.js"
import type { Game, GameEvent, GamePlayer, Meld, PlayerId, TurnActionKind } from "./model.js"
import { replenishTable } from "./table.js"

export type TurnAction =
  | { readonly type: "draw" }
  | { readonly type: "layDown"; readonly cards: readonly Card[] }
  | {
      readonly type: "takeFromTable"
      readonly tableCards: readonly Card[]
      readonly handCards: readonly Card[]
    }
  | {
      readonly type: "steal"
      readonly targetId: PlayerId
      readonly rank: Rank
      readonly handCards: readonly Card[]
    }
  | { readonly type: "discard"; readonly card: Card }

interface Mutation {
  readonly players: readonly GamePlayer[]
  readonly deck: readonly Card[]
  readonly table: readonly Card[]
  readonly event: GameEvent
}

type MutationResult = Result<Mutation, GameErrorCode>

const removeCards = (pile: readonly Card[], cards: readonly Card[]): readonly Card[] | null => {
  const selected = new Set(cards)
  const holdsEverything = selected.size === cards.length && cards.every((c) => pile.includes(c))
  return holdsEverything ? pile.filter((card) => !selected.has(card)) : null
}

const mergeIntoMelds = (
  melds: readonly Meld[],
  rank: Rank,
  cards: readonly Card[]
): readonly Meld[] =>
  melds.some((meld) => meld.rank === rank)
    ? melds.map((meld) => (meld.rank === rank ? { rank, cards: [...meld.cards, ...cards] } : meld))
    : [...melds, { rank, cards }]

const meldSizeAfter = (melds: readonly Meld[], rank: Rank, added: number): number =>
  (melds.find((meld) => meld.rank === rank)?.cards.length ?? 0) + added

const draw = (game: Game, actor: GamePlayer): MutationResult => {
  const [card, ...deck] = game.deck
  if (!card) return err("DECK_EMPTY")
  return ok({
    players: replacePlayer(game.players, { ...actor, hand: [...actor.hand, card] }),
    deck,
    table: game.table,
    event: { type: "drew", playerId: actor.id },
  })
}

const layDown = (game: Game, actor: GamePlayer, cards: readonly Card[]): MutationResult => {
  if (cards.length === 0) return err("NO_CARDS_SELECTED")
  if (!shareRank(cards)) return err("CARDS_MUST_SHARE_RANK")
  const hand = removeCards(actor.hand, cards)
  if (!hand) return err("CARD_NOT_IN_HAND")
  const rank = rankOf(cards[0] as Card)
  const size = meldSizeAfter(actor.melds, rank, cards.length)
  if (size < 2) return err("MELD_REQUIRES_TWO_CARDS")
  return ok({
    players: replacePlayer(game.players, {
      ...actor,
      hand,
      melds: mergeIntoMelds(actor.melds, rank, cards),
    }),
    deck: game.deck,
    table: game.table,
    event: {
      type: "laidDown",
      playerId: actor.id,
      rank,
      count: cards.length,
      completed: size === QUAD_SIZE,
    },
  })
}

const takeFromTable = (
  game: Game,
  actor: GamePlayer,
  tableCards: readonly Card[],
  handCards: readonly Card[]
): MutationResult => {
  if (handCards.length === 0) return err("NO_CARDS_SELECTED")
  const table = removeCards(game.table, tableCards)
  if (!table || tableCards.length === 0) return err("CARD_NOT_ON_TABLE")
  if (!shareRank([...tableCards, ...handCards])) return err("CARDS_MUST_SHARE_RANK")
  const hand = removeCards(actor.hand, handCards)
  if (!hand) return err("CARD_NOT_IN_HAND")
  const rank = rankOf(handCards[0] as Card)
  const moved = [...handCards, ...tableCards]
  return ok({
    players: replacePlayer(game.players, {
      ...actor,
      hand,
      melds: mergeIntoMelds(actor.melds, rank, moved),
    }),
    deck: game.deck,
    table,
    event: {
      type: "tookFromTable",
      playerId: actor.id,
      rank,
      count: moved.length,
      tableCount: tableCards.length,
      completed: meldSizeAfter(actor.melds, rank, moved.length) === QUAD_SIZE,
    },
  })
}

const steal = (
  game: Game,
  actor: GamePlayer,
  action: Extract<TurnAction, { type: "steal" }>
): MutationResult => {
  const { targetId, rank, handCards } = action
  if (targetId === actor.id) return err("CANNOT_STEAL_FROM_SELF")
  const target = findPlayer(game, targetId)
  if (!target) return err("TARGET_NOT_FOUND")
  const meld = target.melds.find((candidate) => candidate.rank === rank)
  if (!meld || isComplete(meld)) return err("MELD_NOT_STEALABLE")
  const holdsOwnMeld = actor.melds.some((own) => own.rank === rank)
  if (handCards.length === 0 && !holdsOwnMeld) return err("NO_CARDS_SELECTED")
  if (handCards.some((card) => rankOf(card) !== rank)) return err("CARDS_MUST_SHARE_RANK")
  const hand = removeCards(actor.hand, handCards)
  if (!hand) return err("CARD_NOT_IN_HAND")
  const moved = [...meld.cards, ...handCards]
  const updatedTarget = {
    ...target,
    melds: target.melds.filter((candidate) => candidate !== meld),
  }
  const updatedActor = { ...actor, hand, melds: mergeIntoMelds(actor.melds, rank, moved) }
  return ok({
    players: replacePlayer(replacePlayer(game.players, updatedTarget), updatedActor),
    deck: game.deck,
    table: game.table,
    event: {
      type: "stole",
      playerId: actor.id,
      targetId,
      rank,
      stolenCount: meld.cards.length,
      completed: meldSizeAfter(actor.melds, rank, moved.length) === QUAD_SIZE,
    },
  })
}

const discard = (game: Game, actor: GamePlayer, card: Card): MutationResult => {
  const hand = removeCards(actor.hand, [card])
  if (!hand) return err("CARD_NOT_IN_HAND")
  return ok({
    players: replacePlayer(game.players, { ...actor, hand }),
    deck: game.deck,
    table: [...game.table, card],
    event: { type: "discarded", playerId: actor.id, card },
  })
}

const execute = (game: Game, actor: GamePlayer, action: TurnAction): MutationResult => {
  switch (action.type) {
    case "draw":
      return draw(game, actor)
    case "layDown":
      return layDown(game, actor, action.cards)
    case "takeFromTable":
      return takeFromTable(game, actor, action.tableCards, action.handCards)
    case "steal":
      return steal(game, actor, action)
    case "discard":
      return discard(game, actor, action.card)
  }
}

const finishIfComplete = (game: Game): Game =>
  isEveryQuadComplete(game.players)
    ? { ...game, endReason: "allQuadsComplete", winnerIds: findWinnerIds(game.players) }
    : game

const commit = (game: Game, kind: TurnActionKind, mutation: Mutation): Game => {
  const { event, ...changes } = mutation
  const mutated = replenishTable({
    ...game,
    ...changes,
    events: appendEvents(game.events, event),
  })
  return {
    ...finishIfComplete(mutated),
    turn: { ...game.turn, usedActions: [...game.turn.usedActions, kind] },
  }
}

const refusalForPlayMade = (
  usedActions: readonly TurnActionKind[],
  action: TurnAction
): GameErrorCode | null => {
  if (usedActions.length === 0) return null
  if (usedActions.length > 1 || usedActions[0] !== "draw") return "ACTION_ALREADY_USED"
  return action.type === "discard" || action.type === "takeFromTable" ? null : "MUST_DISCARD"
}

export const applyTurnAction = (
  game: Game,
  playerId: PlayerId,
  action: TurnAction
): Result<Game, GameErrorCode> => {
  if (isFinished(game)) return err("GAME_FINISHED")
  if (game.turn.playerId !== playerId) return err("NOT_YOUR_TURN")
  const refusal = refusalForPlayMade(game.turn.usedActions, action)
  if (refusal) return err(refusal)
  const mutation = execute(game, getPlayer(game, playerId), action)
  return mutation.ok ? ok(commit(game, action.type, mutation.value)) : mutation
}

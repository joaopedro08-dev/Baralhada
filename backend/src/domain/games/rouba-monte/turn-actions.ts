import { rankOf, sameRank } from "../../cards/card.js"
import type { Card } from "../../cards/card.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { GameErrorCode } from "./errors.js"
import { appendEvents, findPlayer, getPlayer, isFinished, replacePlayer, topOf } from "./model.js"
import type { Game, GameEvent, GamePlayer, PlayerId } from "./model.js"

export type CardPlay =
  | { readonly type: "capture"; readonly card: Card; readonly tableCards: readonly Card[] }
  | { readonly type: "stack"; readonly card: Card }
  | { readonly type: "steal"; readonly card: Card; readonly targetId: PlayerId }
  | { readonly type: "discard"; readonly card: Card }

export type TurnAction = CardPlay | { readonly type: "draw" }

export type TurnActionKind = TurnAction["type"]

interface Mutation {
  readonly players: readonly GamePlayer[]
  readonly table: readonly Card[]
  readonly event: GameEvent
}

type MutationResult = Result<Mutation, GameErrorCode>

const withoutCards = (pile: readonly Card[], cards: readonly Card[]): readonly Card[] | null => {
  const selected = new Set(cards)
  const holdsEverything = selected.size === cards.length && cards.every((c) => pile.includes(c))
  return holdsEverything ? pile.filter((card) => !selected.has(card)) : null
}

const capture = (
  game: Game,
  actor: GamePlayer,
  hand: readonly Card[],
  { card, tableCards }: Extract<CardPlay, { type: "capture" }>
): MutationResult => {
  if (tableCards.length === 0) return err("NO_TABLE_CARDS_SELECTED")
  const table = withoutCards(game.table, tableCards)
  if (!table) return err("CARD_NOT_ON_TABLE")
  if (!tableCards.every((taken) => sameRank(taken, card))) return err("CARDS_MUST_SHARE_RANK")
  return ok({
    players: replacePlayer(game.players, {
      ...actor,
      hand,
      pile: [...actor.pile, ...tableCards, card],
    }),
    table,
    event: { type: "captured", playerId: actor.id, card, tableCards },
  })
}

const stack = (
  game: Game,
  actor: GamePlayer,
  hand: readonly Card[],
  card: Card
): MutationResult => {
  const top = topOf(actor.pile)
  if (!top) return err("PILE_EMPTY")
  if (!sameRank(top, card)) return err("TOP_MISMATCH")
  return ok({
    players: replacePlayer(game.players, { ...actor, hand, pile: [...actor.pile, card] }),
    table: game.table,
    event: { type: "stacked", playerId: actor.id, card },
  })
}

const steal = (
  game: Game,
  actor: GamePlayer,
  hand: readonly Card[],
  { card, targetId }: Extract<CardPlay, { type: "steal" }>
): MutationResult => {
  if (targetId === actor.id) return err("CANNOT_STEAL_FROM_SELF")
  const target = findPlayer(game, targetId)
  if (!target) return err("TARGET_NOT_FOUND")
  const top = topOf(target.pile)
  if (!top) return err("PILE_EMPTY")
  if (!sameRank(top, card)) return err("TOP_MISMATCH")
  const players = replacePlayer(game.players, { ...target, pile: [] })
  return ok({
    players: replacePlayer(players, {
      ...actor,
      hand,
      pile: [...actor.pile, ...target.pile, card],
    }),
    table: game.table,
    event: {
      type: "stole",
      playerId: actor.id,
      targetId,
      card,
      stolenCount: target.pile.length,
    },
  })
}

const discard = (
  game: Game,
  actor: GamePlayer,
  hand: readonly Card[],
  card: Card
): MutationResult =>
  ok({
    players: replacePlayer(game.players, { ...actor, hand }),
    table: [...game.table, card],
    event: { type: "discarded", playerId: actor.id, card },
  })

const execute = (
  game: Game,
  actor: GamePlayer,
  hand: readonly Card[],
  action: CardPlay
): MutationResult => {
  switch (action.type) {
    case "capture":
      return capture(game, actor, hand, action)
    case "stack":
      return stack(game, actor, hand, action.card)
    case "steal":
      return steal(game, actor, hand, action)
    case "discard":
      return discard(game, actor, hand, action.card)
  }
}

const playCard = (game: Game, actor: GamePlayer, action: CardPlay): Result<Game, GameErrorCode> => {
  const hand = withoutCards(actor.hand, [action.card])
  if (!hand) return err("CARD_NOT_IN_HAND")
  const mutation = execute(game, actor, hand, action)
  if (!mutation.ok) return mutation
  const { event, ...changes } = mutation.value
  return ok({ ...game, ...changes, events: appendEvents(game.events, event) })
}

const drawCard = (game: Game, actor: GamePlayer): Game => {
  const [card, ...deck] = game.deck as [Card, ...Card[]]
  return {
    ...game,
    players: replacePlayer(game.players, { ...actor, hand: [...actor.hand, card] }),
    deck,
    turn: { ...game.turn, drew: true },
    events: appendEvents(game.events, { type: "drew", playerId: actor.id }),
  }
}

const drawRefusal = (game: Game): GameErrorCode | null => {
  if (game.turn.drew) return "ALREADY_DREW"
  return game.deck.length === 0 ? "DECK_EMPTY" : null
}

export const applyTurnAction = (
  game: Game,
  playerId: PlayerId,
  action: TurnAction
): Result<Game, GameErrorCode> => {
  if (isFinished(game)) return err("GAME_FINISHED")
  if (game.turn.playerId !== playerId) return err("NOT_YOUR_TURN")
  const actor = getPlayer(game, playerId)
  if (action.type !== "draw") return playCard(game, actor, action)
  const refusal = drawRefusal(game)
  return refusal ? err(refusal) : ok(drawCard(game, actor))
}

export const anyoneCanScore = (game: Game): boolean => {
  const tops = game.players.flatMap((seated) => topOf(seated.pile) ?? [])
  const targets = new Set([...game.table, ...tops].map(rankOf))
  return game.players.some((player) => player.hand.some((card) => targets.has(rankOf(card))))
}

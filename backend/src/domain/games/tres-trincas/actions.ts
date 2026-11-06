import type { Card } from "../../cards/card.js"
import type { RandomSource } from "../../shared/random.js"
import { pickOne, shuffle } from "../../shared/random.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { TrincaErrorCode } from "./errors.js"
import {
  findPlayer,
  getPlayer,
  isFinished,
  MIN_PLAYERS,
  replacePlayer,
  seatAfter,
  SET_SIZE,
  SETS_TO_WIN,
  withEvents,
  withoutCards,
} from "./model.js"
import type { PlayerId, TrincaGame, TrincaPlayer } from "./model.js"
import { isDead, jokersFor, splitIntoSets } from "./sets.js"

export type TrincaAction =
  | { readonly type: "draw" }
  | { readonly type: "discard"; readonly card: Card }
  | { readonly type: "meld"; readonly cards: readonly Card[] }

type Outcome = Result<TrincaGame, TrincaErrorCode>

const refillStock = (game: TrincaGame, random: RandomSource): TrincaGame => {
  if (game.stock.length > 0 || game.discard.length === 0) return game
  return withEvents(
    { ...game, stock: shuffle(game.discard, random), discard: [] },
    { type: "restocked", count: game.discard.length }
  )
}

const drawCard = (game: TrincaGame, playerId: PlayerId, random: RandomSource): TrincaGame => {
  const stocked = refillStock(game, random)
  const [card, ...stock] = stocked.stock
  if (!card) return stocked
  const player = getPlayer(stocked, playerId)
  const drawn = withEvents(
    {
      ...stocked,
      players: replacePlayer(stocked.players, { ...player, hand: [...player.hand, card] }),
      stock,
    },
    { type: "drew", playerId }
  )
  return refillStock(drawn, random)
}

const passTurn = (game: TrincaGame): TrincaGame => ({
  ...game,
  turn: {
    number: game.turn.number + 1,
    playerId: seatAfter(game.players, game.turn.playerId),
    stage: "start",
  },
})

const finish = (game: TrincaGame, winnerId: PlayerId): TrincaGame =>
  withEvents({ ...game, endReason: "sets", winnerId }, { type: "won", playerId: winnerId })

export const meldLimitOf = (game: TrincaGame, player: TrincaPlayer): number => {
  if (game.turn.stage === "start") return player.sets.length === 0 ? 2 : 0
  return player.sets.length > 0 ? 1 : 0
}

const draw = (game: TrincaGame, player: TrincaPlayer, random: RandomSource): Outcome => {
  if (game.turn.stage === "drawn") return err("ALREADY_DREW")
  return ok({ ...drawCard(game, player.id, random), turn: { ...game.turn, stage: "drawn" } })
}

const discard = (game: TrincaGame, player: TrincaPlayer, card: Card): Outcome => {
  if (game.turn.stage === "start") return err("DRAW_FIRST")
  const hand = withoutCards(player.hand, [card])
  if (!hand) return err("CARD_NOT_IN_HAND")
  const discarded = withEvents(
    {
      ...game,
      players: replacePlayer(game.players, { ...player, hand }),
      discard: [...game.discard, card],
    },
    { type: "discarded", playerId: player.id, card }
  )
  return ok(passTurn(discarded))
}

const meldRefusal = (
  game: TrincaGame,
  player: TrincaPlayer,
  cards: readonly Card[]
): TrincaErrorCode | null => {
  const limit = meldLimitOf(game, player)
  if (limit === 0) return game.turn.stage === "start" ? "DRAW_BEFORE_MELD" : "MELD_ONLY_AT_START"
  const count = cards.length / SET_SIZE
  return Number.isInteger(count) && count >= 1 && count <= limit ? null : "WRONG_MELD_SIZE"
}

const meld = (
  game: TrincaGame,
  player: TrincaPlayer,
  cards: readonly Card[],
  random: RandomSource
): Outcome => {
  const refusal = meldRefusal(game, player, cards)
  if (refusal) return err(refusal)
  const hand = withoutCards(player.hand, cards)
  if (!hand) return err("CARD_NOT_IN_HAND")
  const jokers = jokersFor(game.vira)
  if (cards.some((card) => isDead(card, jokers))) return err("DEAD_CARD")
  const sets = splitIntoSets(cards, jokers)
  if (!sets) return err("NOT_A_SET")
  const melder: TrincaPlayer = { ...player, hand, sets: [...player.sets, ...sets] }
  const melded = withEvents(
    { ...game, players: replacePlayer(game.players, melder) },
    { type: "melded", playerId: player.id, sets }
  )
  if (melder.sets.length >= SETS_TO_WIN) return ok(finish(melded, player.id))
  return ok(passTurn(sets.length > 1 ? drawCard(melded, player.id, random) : melded))
}

export const playTrincas = (
  game: TrincaGame,
  playerId: PlayerId,
  action: TrincaAction,
  random: RandomSource
): Outcome => {
  if (isFinished(game)) return err("GAME_FINISHED")
  if (game.turn.playerId !== playerId) return err("NOT_YOUR_TURN")
  const player = getPlayer(game, playerId)
  switch (action.type) {
    case "draw":
      return draw(game, player, random)
    case "discard":
      return discard(game, player, action.card)
    case "meld":
      return meld(game, player, action.cards, random)
  }
}

export const expireTrincas = (game: TrincaGame, random: RandomSource): TrincaGame => {
  if (isFinished(game)) return game
  const playerId = game.turn.playerId
  const timedOut = withEvents(game, { type: "timedOut", playerId })
  const drawn =
    game.turn.stage === "start"
      ? { ...drawCard(timedOut, playerId, random), turn: { ...game.turn, stage: "drawn" as const } }
      : timedOut
  const player = getPlayer(drawn, playerId)
  const discarded =
    player.hand.length > 0 ? discard(drawn, player, pickOne(player.hand, random)) : null
  return discarded?.ok ? discarded.value : passTurn(drawn)
}

export const removeTrincasPlayer = (
  game: TrincaGame,
  playerId: PlayerId,
  random: RandomSource
): TrincaGame => {
  const leaving = findPlayer(game, playerId)
  if (isFinished(game) || !leaving) return game
  const returned = [...leaving.hand, ...leaving.sets.flat()]
  const players = game.players.filter((player) => player.id !== playerId)
  const reduced = withEvents(
    { ...game, players, stock: shuffle([...game.stock, ...returned], random) },
    { type: "playerLeft", playerId, returnedCount: returned.length }
  )
  const [remaining] = players
  if (players.length < MIN_PLAYERS) {
    const ended: TrincaGame = {
      ...reduced,
      endReason: "abandoned",
      winnerId: remaining?.id ?? null,
    }
    return remaining ? withEvents(ended, { type: "won", playerId: remaining.id }) : ended
  }
  if (game.turn.playerId !== playerId) return reduced
  return {
    ...reduced,
    turn: {
      number: game.turn.number + 1,
      playerId: seatAfter(game.players, playerId),
      stage: "start",
    },
  }
}

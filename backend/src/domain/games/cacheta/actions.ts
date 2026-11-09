import type { Card } from "../../cards/card.js"
import type { RandomSource } from "../../shared/random.js"
import { shuffle } from "../../shared/random.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { CachetaErrorCode } from "./errors.js"
import { knockWith, wildRankFor } from "./melds.js"
import type { Knock } from "./melds.js"
import {
  CLEAN_KNOCK_LOSS,
  findPlayer,
  getPlayer,
  isFinished,
  KNOCK_LOSS,
  MIN_PLAYERS,
  nextPlayingAfter,
  playingOf,
  replacePlayer,
  withEvents,
  withoutOne,
} from "./model.js"
import type {
  CachetaEndReason,
  CachetaGame,
  CachetaPlayer,
  CachetaTurn,
  PlayerId,
  PointLoss,
} from "./model.js"
import { dealRound } from "./setup.js"

export type CachetaAction =
  | { readonly type: "draw" }
  | { readonly type: "take" }
  | { readonly type: "discard"; readonly card: Card }
  | { readonly type: "knock"; readonly card: Card }

type Outcome = Result<CachetaGame, CachetaErrorCode>

const restock = (game: CachetaGame, random: RandomSource): CachetaGame => {
  if (game.stock.length > 0 || game.discard.length <= 1) return game
  const pile = game.discard.slice(0, -1)
  return withEvents(
    { ...game, stock: shuffle(pile, random), discard: game.discard.slice(-1) },
    { type: "restocked", count: pile.length }
  )
}

const pickedTurn = (turn: CachetaTurn, card: Card): CachetaTurn => ({
  ...turn,
  stage: "drawn",
  drawn: card,
})

const drawFromStock = (game: CachetaGame, playerId: PlayerId, random: RandomSource) => {
  const stocked = restock(game, random)
  const [card, ...stock] = stocked.stock
  if (!card) return stocked
  const player = getPlayer(stocked, playerId)
  const drawn = replacePlayer(
    { ...stocked, stock, turn: pickedTurn(stocked.turn, card) },
    { ...player, hand: [...player.hand, card] }
  )
  return restock(withEvents(drawn, { type: "drew", playerId }), random)
}

const passTurn = (game: CachetaGame, fromId: PlayerId = game.turn.playerId): CachetaGame => ({
  ...game,
  turn: {
    number: game.turn.number + 1,
    playerId: nextPlayingAfter(game, fromId),
    stage: "start",
    drawn: null,
  },
})

const finish = (game: CachetaGame, reason: CachetaEndReason, winnerId: PlayerId | null) => {
  const ended: CachetaGame = { ...game, endReason: reason, winnerId, pending: null }
  return winnerId ? withEvents(ended, { type: "won", playerId: winnerId }) : ended
}

const take = (game: CachetaGame, player: CachetaPlayer): Outcome => {
  const card = game.discard.at(-1)
  if (!card) return err("EMPTY_DISCARD")
  const taken = replacePlayer(
    { ...game, discard: game.discard.slice(0, -1), turn: pickedTurn(game.turn, card) },
    { ...player, hand: [...player.hand, card] }
  )
  return ok(withEvents(taken, { type: "tookDiscard", playerId: player.id, card }))
}

const putDown = (game: CachetaGame, player: CachetaPlayer, card: Card): CachetaGame | null => {
  const hand = withoutOne(player.hand, card)
  if (!hand) return null
  return withEvents(
    replacePlayer({ ...game, discard: [...game.discard, card] }, { ...player, hand }),
    {
      type: "discarded",
      playerId: player.id,
      card,
    }
  )
}

const discard = (game: CachetaGame, player: CachetaPlayer, card: Card): Outcome => {
  if (game.turn.stage === "start") return err("PICK_BEFORE_DISCARD")
  const discarded = putDown(game, player, card)
  return discarded ? ok(passTurn(discarded)) : err("CARD_NOT_IN_HAND")
}

const lossesAfter = (game: CachetaGame, knockerId: PlayerId, loss: number) =>
  game.players
    .filter((player) => player.status === "playing" && player.id !== knockerId)
    .map((player): PointLoss => ({
      playerId: player.id,
      before: player.points,
      after: Math.max(0, player.points - loss),
    }))

const settleKnock = (game: CachetaGame, knockerId: PlayerId, knock: Knock): CachetaGame => {
  const losses = lossesAfter(game, knockerId, knock.clean ? CLEAN_KNOCK_LOSS : KNOCK_LOSS)
  const eliminatedIds = losses.filter((loss) => loss.after === 0).map((loss) => loss.playerId)
  const scored: CachetaGame = withEvents(
    {
      ...game,
      players: game.players.map((player) => {
        const loss = losses.find((entry) => entry.playerId === player.id)
        if (!loss) return player
        return { ...player, points: loss.after, status: loss.after === 0 ? "out" : "playing" }
      }),
      lastRound: {
        round: game.round,
        knockerId,
        melds: knock.melds,
        discard: knock.discard,
        clean: knock.clean,
        losses,
        eliminatedIds,
      },
      eliminations: [...game.eliminations, ...eliminatedIds],
      turn: { number: game.turn.number + 1, playerId: knockerId, stage: "start", drawn: null },
    },
    { type: "knocked", playerId: knockerId, clean: knock.clean },
    ...eliminatedIds.map((playerId) => ({ type: "eliminated" as const, playerId }))
  )
  if (playingOf(scored).length < MIN_PLAYERS) return finish(scored, "knockout", knockerId)
  return { ...scored, pending: "nextRound" }
}

const knock = (game: CachetaGame, player: CachetaPlayer, card: Card): Outcome => {
  if (game.turn.stage === "start") return err("PICK_BEFORE_KNOCK")
  if (!player.hand.includes(card)) return err("CARD_NOT_IN_HAND")
  const found = knockWith(player.hand, card, wildRankFor(game.vira))
  if (!found) return err("NOT_A_KNOCK")
  const discarded = putDown(game, player, card) as CachetaGame
  return ok(settleKnock(discarded, player.id, found))
}

const refusalOf = (game: CachetaGame, playerId: PlayerId): CachetaErrorCode | null => {
  if (isFinished(game)) return "GAME_FINISHED"
  if (game.pending !== null) return "ROUND_CLOSING"
  return game.turn.playerId === playerId ? null : "NOT_YOUR_TURN"
}

export const playCacheta = (
  game: CachetaGame,
  playerId: PlayerId,
  action: CachetaAction,
  random: RandomSource
): Outcome => {
  const refusal = refusalOf(game, playerId)
  if (refusal) return err(refusal)
  const player = getPlayer(game, playerId)
  if (action.type !== "discard" && action.type !== "knock" && game.turn.stage === "drawn") {
    return err("ALREADY_DREW")
  }
  switch (action.type) {
    case "draw":
      return ok(drawFromStock(game, playerId, random))
    case "take":
      return take(game, player)
    case "discard":
      return discard(game, player, action.card)
    case "knock":
      return knock(game, player, action.card)
  }
}

const advancePending = (game: CachetaGame, random: RandomSource): CachetaGame =>
  dealRound(game, game.round + 1, nextPlayingAfter(game, game.starterId), random)

export const expireCacheta = (game: CachetaGame, random: RandomSource): CachetaGame => {
  if (isFinished(game)) return game
  if (game.pending !== null) return advancePending(game, random)
  const playerId = game.turn.playerId
  const timedOut = withEvents(game, { type: "timedOut", playerId })
  const drawn = game.turn.stage === "start" ? drawFromStock(timedOut, playerId, random) : timedOut
  const player = getPlayer(drawn, playerId)
  const card = drawn.turn.drawn ?? player.hand.at(-1)
  const discarded = card ? putDown(drawn, player, card) : null
  return passTurn(discarded ?? drawn)
}

export const removeCachetaPlayer = (
  game: CachetaGame,
  playerId: PlayerId,
  random: RandomSource
): CachetaGame => {
  const leaving = findPlayer(game, playerId)
  if (isFinished(game) || leaving?.status !== "playing") return game
  const reduced = withEvents(
    {
      ...replacePlayer(game, { ...leaving, hand: [], status: "left" }),
      stock: shuffle([...game.stock, ...leaving.hand], random),
      eliminations: [...game.eliminations, playerId],
    },
    { type: "playerLeft", playerId, returnedCount: leaving.hand.length }
  )
  const remaining = playingOf(reduced)
  if (remaining.length < MIN_PLAYERS) return finish(reduced, "abandoned", remaining[0]?.id ?? null)
  if (reduced.pending !== null || game.turn.playerId !== playerId) return reduced
  return passTurn(reduced, playerId)
}

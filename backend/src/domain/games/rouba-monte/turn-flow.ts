import type { RandomSource } from "../../shared/random.js"
import { pickOne, shuffle } from "../../shared/random.js"
import { ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import type { GameErrorCode } from "./errors.js"
import {
  appendEvents,
  findWinnerIds,
  getPlayer,
  HAND_SIZE,
  isFinished,
  MIN_PLAYERS,
  replacePlayer,
  seatsAfter,
} from "./model.js"
import type { Game, GameEndReason, GameEvent, GamePlayer, PlayerId } from "./model.js"
import { replenishTable } from "./table.js"
import { anyoneCanScore, applyTurnAction, turnRefusal } from "./turn-actions.js"
import type { TurnAction } from "./turn-actions.js"

const refillHand = (game: Game, playerId: PlayerId): Game => {
  const player = getPlayer(game, playerId)
  const count = Math.min(HAND_SIZE, game.deck.length)
  if (player.hand.length > 0 || count === 0) return game
  return {
    ...game,
    players: replacePlayer(game.players, { ...player, hand: game.deck.slice(0, count) }),
    deck: game.deck.slice(count),
    events: appendEvents(game.events, { type: "handRefilled", playerId, count }),
  }
}

const endReasonOf = (game: Game): GameEndReason | null => {
  if (game.players.every((player) => player.hand.length === 0)) return "handsEmpty"
  if (game.deck.length > 0) return null
  return anyoneCanScore(game) ? null : "noPlaysLeft"
}

const finish = (game: Game, endReason: GameEndReason): Game => ({
  ...game,
  endReason,
  winnerIds: findWinnerIds(game.players),
})

const settleTurn = (game: Game, rotation: readonly PlayerId[]): Game => {
  const settled = replenishTable(rotation.reduce(refillHand, game))
  const endReason = endReasonOf(settled)
  if (endReason) return finish(settled, endReason)
  const next = rotation.find((id) => getPlayer(settled, id).hand.length > 0) as PlayerId
  return { ...settled, turn: { number: game.turn.number + 1, playerId: next, drew: false } }
}

export const playTurn = (
  game: Game,
  playerId: PlayerId,
  action: TurnAction
): Result<Game, GameErrorCode> => {
  const played = applyTurnAction(game, playerId, action)
  if (!played.ok) return played
  return ok(
    action.type === "draw" ? played.value : settleTurn(played.value, seatsAfter(game, playerId))
  )
}

const discardAtRandom = (game: Game, player: GamePlayer, random: RandomSource): Game => {
  const card = pickOne(player.hand, random)
  return {
    ...game,
    players: replacePlayer(game.players, {
      ...player,
      hand: player.hand.filter((held) => held !== card),
    }),
    table: [...game.table, card],
    events: appendEvents(game.events, { type: "discarded", playerId: player.id, card }),
  }
}

export const expireTurn = (game: Game, random: RandomSource): Game => {
  if (isFinished(game)) return game
  const player = getPlayer(game, game.turn.playerId)
  const timedOut: Game = {
    ...game,
    events: appendEvents(game.events, { type: "turnTimedOut", playerId: player.id }),
  }
  const mayPass = turnRefusal(game, player.id, "pass") === null
  const settled = mayPass ? timedOut : discardAtRandom(timedOut, player, random)
  return settleTurn(settled, seatsAfter(game, player.id))
}

export const removePlayer = (game: Game, playerId: PlayerId, random: RandomSource): Game => {
  if (isFinished(game)) return game
  const leaving = getPlayer(game, playerId)
  const returned = [...leaving.hand, ...leaving.pile]
  const event: GameEvent = { type: "playerLeft", playerId, returnedCount: returned.length }
  const reduced: Game = {
    ...game,
    players: game.players.filter((player) => player.id !== playerId),
    deck: shuffle([...game.deck, ...returned], random),
    events: appendEvents(game.events, event),
  }

  if (reduced.players.length < MIN_PLAYERS) {
    return { ...reduced, endReason: "abandoned", winnerIds: reduced.players.map(({ id }) => id) }
  }
  if (game.turn.playerId !== playerId) return reduced
  return settleTurn(
    reduced,
    seatsAfter(game, playerId).filter((id) => id !== playerId)
  )
}

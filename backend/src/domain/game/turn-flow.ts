import type { Card } from "../cards/card.js"
import type { RandomSource } from "../shared/random.js"
import { pickOne, shuffle } from "../shared/random.js"
import { err, ok } from "../shared/result.js"
import type { Result } from "../shared/result.js"
import type { GameErrorCode } from "./errors.js"
import {
  appendEvents,
  getPlayer,
  HAND_SIZE,
  isComplete,
  isFinished,
  MIN_PLAYERS,
  replacePlayer,
} from "./model.js"
import type { Game, GameEvent, GamePlayer, PlayerId } from "./model.js"
import { replenishTable } from "./table.js"
import { applyTurnAction } from "./turn-actions.js"
import type { TurnAction } from "./turn-actions.js"

const refillHand = (game: Game, playerId: PlayerId): Game => {
  const player = getPlayer(game, playerId)
  const count = Math.min(Math.max(HAND_SIZE - player.hand.length, 0), game.deck.length)
  if (count === 0) return game
  return {
    ...game,
    players: replacePlayer(game.players, {
      ...player,
      hand: [...player.hand, ...game.deck.slice(0, count)],
    }),
    deck: game.deck.slice(count),
    events: appendEvents(game.events, { type: "handRefilled", playerId, count }),
  }
}

const seatsAfter = (game: Game, playerId: PlayerId): readonly GamePlayer[] => {
  const index = game.players.findIndex((player) => player.id === playerId)
  return [...game.players.slice(index + 1), ...game.players.slice(0, index + 1)]
}

const canPlay = (game: Game, player: GamePlayer): boolean =>
  game.deck.length > 0 || player.hand.length > 0

const beginTurn = (game: Game, playerId: PlayerId): Game => ({
  ...game,
  turn: { number: game.turn.number + 1, playerId, usedActions: [] },
})

const collectRecyclableCards = (game: Game): readonly Card[] =>
  game.table.length > 0
    ? game.table
    : game.players.flatMap((player) =>
        player.melds.filter((meld) => !isComplete(meld)).flatMap((meld) => meld.cards)
      )

const dealOneCardPerSeat = (game: Game, seats: readonly GamePlayer[]): Game =>
  seats.reduce<Game>((current, seat) => {
    const player = getPlayer(current, seat.id)
    const [card, ...deck] = current.deck
    if (!card || player.hand.length >= HAND_SIZE) return current
    return {
      ...current,
      deck,
      players: replacePlayer(current.players, { ...player, hand: [...player.hand, card] }),
    }
  }, game)

const recyclePile = (game: Game, seats: readonly GamePlayer[], random: RandomSource): Game => {
  const recycled = collectRecyclableCards(game)
  const fromTable = game.table.length > 0
  let dealt: Game = {
    ...game,
    table: [],
    deck: shuffle(recycled, random),
    players: fromTable
      ? game.players
      : game.players.map((player) => ({
          ...player,
          melds: player.melds.filter(isComplete),
        })),
    events: appendEvents(game.events, { type: "pileRecycled", count: recycled.length }),
  }
  for (let round = 0; round < HAND_SIZE; round++) dealt = dealOneCardPerSeat(dealt, seats)
  return dealt
}

const advanceTurn = (game: Game, random: RandomSource): Game => {
  const seats = seatsAfter(game, game.turn.playerId)
  const replenished = replenishTable(game)
  const next = seats.find((seat) => canPlay(replenished, getPlayer(replenished, seat.id)))
  if (next) return beginTurn(replenished, next.id)
  const recycled = replenishTable(recyclePile(replenished, seats, random))
  const firstAble = seats.find((seat) => getPlayer(recycled, seat.id).hand.length > 0)
  return beginTurn(recycled, (firstAble ?? (seats[0] as GamePlayer)).id)
}

const mustDiscardToClose = (game: Game, playerId: PlayerId): boolean =>
  game.deck.length > 0 && getPlayer(game, playerId).hand.length > HAND_SIZE

export const endTurn = (
  game: Game,
  playerId: PlayerId,
  random: RandomSource
): Result<Game, GameErrorCode> => {
  if (isFinished(game)) return err("GAME_FINISHED")
  if (game.turn.playerId !== playerId) return err("NOT_YOUR_TURN")
  if (mustDiscardToClose(game, playerId)) return err("MUST_DISCARD")
  return ok(advanceTurn(refillHand(game, playerId), random))
}

export const playTurn = (
  game: Game,
  playerId: PlayerId,
  action: TurnAction,
  random: RandomSource
): Result<Game, GameErrorCode> => {
  const played = applyTurnAction(game, playerId, action)
  if (!played.ok) return played
  const waitsForDiscard = action.type === "draw" && mustDiscardToClose(played.value, playerId)
  const stays = isFinished(played.value) || waitsForDiscard
  return ok(stays ? played.value : advanceTurn(refillHand(played.value, playerId), random))
}

const mustDiscardOnTimeout = (game: Game, player: GamePlayer): boolean => {
  if (player.hand.length === 0) return false
  if (game.deck.length > 0) return player.hand.length > HAND_SIZE
  return !game.turn.usedActions.includes("discard")
}

const discardRandomCard = (game: Game, player: GamePlayer, random: RandomSource): Game => {
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
  const settled = mustDiscardOnTimeout(game, player)
    ? discardRandomCard(timedOut, player, random)
    : timedOut
  return advanceTurn(refillHand(settled, player.id), random)
}

const returnedCardsOf = (player: GamePlayer): readonly Card[] => [
  ...player.hand,
  ...player.melds.flatMap((meld) => meld.cards),
]

export const removePlayer = (game: Game, playerId: PlayerId, random: RandomSource): Game => {
  if (isFinished(game)) return game
  const leaving = getPlayer(game, playerId)
  const returned = returnedCardsOf(leaving)
  const event: GameEvent = { type: "playerLeft", playerId, returnedCount: returned.length }
  const seats = seatsAfter(game, playerId).filter((seat) => seat.id !== playerId)
  const reduced: Game = {
    ...game,
    players: game.players.filter((player) => player.id !== playerId),
    deck: shuffle([...game.deck, ...returned], random),
    events: appendEvents(game.events, event),
  }

  if (reduced.players.length < MIN_PLAYERS) {
    return {
      ...reduced,
      endReason: "abandoned",
      winnerIds: reduced.players.map((player) => player.id),
    }
  }
  if (game.turn.playerId !== playerId) return reduced
  return beginTurn(reduced, (seats[0] as GamePlayer).id)
}

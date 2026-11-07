import type { RandomSource } from "../../shared/random.js"
import { err, ok } from "../../shared/result.js"
import type { Result } from "../../shared/result.js"
import { applyMove, movesOf } from "./betting.js"
import type { PokerAction } from "./betting.js"
import type { PokerErrorCode } from "./errors.js"
import { advancePending, potTotalOf, resolveBetting } from "./hand-flow.js"
import {
  findPlayer,
  getPlayer,
  isFinished,
  isInGame,
  MIN_PLAYERS,
  seatBefore,
  withEvents,
} from "./model.js"
import type { PlayerId, PokerGame, PokerPlayer } from "./model.js"

export const playPoker = (
  game: PokerGame,
  playerId: PlayerId,
  action: PokerAction,
  _random: RandomSource
): Result<PokerGame, PokerErrorCode> => {
  if (isFinished(game)) return err("GAME_FINISHED")
  if (game.pending !== null) return err("TABLE_MOVING")
  if (game.deal.actorId !== playerId) return err("NOT_YOUR_TURN")
  const applied = applyMove(game, getPlayer(game, playerId), action)
  if (!applied.ok) return applied
  return ok(resolveBetting({ ...applied.value, step: game.step + 1 }, playerId))
}

export const expirePoker = (game: PokerGame, random: RandomSource): PokerGame => {
  if (isFinished(game)) return game
  if (game.pending !== null) return advancePending({ ...game, step: game.step + 1 }, random)
  const playerId = game.deal.actorId
  const action: PokerAction = movesOf(game, playerId).check ? { type: "check" } : { type: "fold" }
  const played = playPoker(
    withEvents(game, { type: "timedOut", playerId }),
    playerId,
    action,
    random
  )
  return played.ok ? played.value : game
}

const abandon = (game: PokerGame, remaining: PokerPlayer | undefined): PokerGame => {
  if (!remaining) return { ...game, winnerId: null, endReason: "abandoned" }
  const pot = potTotalOf(game)
  const awarded: PokerGame = {
    ...game,
    players: game.players.map((player) =>
      player.id === remaining.id
        ? { ...player, chips: player.chips + pot, bet: 0, committed: 0 }
        : { ...player, bet: 0, committed: 0 }
    ),
    winnerId: remaining.id,
    endReason: "abandoned",
  }
  return withEvents(awarded, { type: "matchWon", playerId: remaining.id })
}

export const removePokerPlayer = (
  game: PokerGame,
  playerId: PlayerId,
  _random: RandomSource
): PokerGame => {
  const leaving = findPlayer(game, playerId)
  if (isFinished(game) || !leaving || !isInGame(leaving)) return game
  const left = withEvents(
    {
      ...game,
      players: game.players.map((player) =>
        player.id === playerId
          ? { ...player, chips: 0, hole: [], status: "out" as const, acted: true }
          : player
      ),
      eliminatedIds: [...game.eliminatedIds, playerId],
      step: game.step + 1,
    },
    { type: "playerLeft", playerId }
  )
  const alive = left.players.filter(isInGame)
  if (alive.length < MIN_PLAYERS) return abandon(left, alive[0])
  if (left.pending === "nextHand") return left
  const actorId = game.deal.actorId
  return resolveBetting(left, actorId === playerId ? playerId : seatBefore(left.players, actorId))
}

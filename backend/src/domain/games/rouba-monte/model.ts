import type { Card } from "../../cards/card.js"
import type { PlayerId } from "../../shared/seat.js"

export type { PlayerId }

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
export const HAND_SIZE = 4
export const TABLE_SIZE = 8
export const TABLE_MINIMUM = 3
export const EVENT_LOG_LIMIT = 200

export interface GamePlayer {
  readonly id: PlayerId
  readonly hand: readonly Card[]
  readonly pile: readonly Card[]
}

export type GameEvent =
  | {
      readonly type: "captured"
      readonly playerId: PlayerId
      readonly card: Card
      readonly tableCards: readonly Card[]
    }
  | { readonly type: "stacked"; readonly playerId: PlayerId; readonly card: Card }
  | {
      readonly type: "stole"
      readonly playerId: PlayerId
      readonly targetId: PlayerId
      readonly card: Card
      readonly stolenCount: number
    }
  | { readonly type: "discarded"; readonly playerId: PlayerId; readonly card: Card }
  | { readonly type: "handRefilled"; readonly playerId: PlayerId; readonly count: number }
  | { readonly type: "tableReplenished"; readonly count: number }
  | { readonly type: "turnTimedOut"; readonly playerId: PlayerId }
  | { readonly type: "playerLeft"; readonly playerId: PlayerId; readonly returnedCount: number }

export interface Turn {
  readonly number: number
  readonly playerId: PlayerId
}

export type GameEndReason = "noPlaysLeft" | "handsEmpty" | "abandoned"

export interface Game {
  readonly nicknames: Readonly<Record<PlayerId, string>>
  readonly players: readonly GamePlayer[]
  readonly deck: readonly Card[]
  readonly table: readonly Card[]
  readonly turn: Turn
  readonly events: readonly GameEvent[]
  readonly endReason: GameEndReason | null
  readonly winnerIds: readonly PlayerId[]
}

export const isFinished = (game: Game): boolean => game.endReason !== null

export const findPlayer = (game: Game, playerId: PlayerId): GamePlayer | undefined =>
  game.players.find((player) => player.id === playerId)

export const getPlayer = (game: Game, playerId: PlayerId): GamePlayer => {
  const player = findPlayer(game, playerId)
  if (!player) throw new Error(`Unknown player ${playerId}`)
  return player
}

export const replacePlayer = (
  players: readonly GamePlayer[],
  updated: GamePlayer
): readonly GamePlayer[] => players.map((player) => (player.id === updated.id ? updated : player))

export const appendEvents = (
  events: readonly GameEvent[],
  ...added: readonly GameEvent[]
): readonly GameEvent[] => [...events, ...added].slice(-EVENT_LOG_LIMIT)

export const topOf = (pile: readonly Card[]): Card | null => pile.at(-1) ?? null

export const seatsAfter = (game: Game, playerId: PlayerId): readonly PlayerId[] => {
  const ids = game.players.map((player) => player.id)
  const index = ids.indexOf(playerId)
  return [...ids.slice(index + 1), ...ids.slice(0, index + 1)]
}

export const findWinnerIds = (players: readonly GamePlayer[]): readonly PlayerId[] => {
  const best = Math.max(...players.map((player) => player.pile.length))
  return players.filter((player) => player.pile.length === best).map(({ id }) => id)
}

import { QUAD_SIZE, TOTAL_QUADS } from "../../cards/card.js"
import type { Card, Rank } from "../../cards/card.js"
import type { PlayerId } from "../../shared/seat.js"

export type { PlayerId }

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
export const HAND_SIZE = 4
export const TABLE_SIZE = 10
export const TABLE_MINIMUM = 3
export const EVENT_LOG_LIMIT = 200

export type TurnActionKind = "draw" | "layDown" | "takeFromTable" | "steal" | "discard"

export interface Meld {
  readonly rank: Rank
  readonly cards: readonly Card[]
}

export interface GamePlayer {
  readonly id: PlayerId
  readonly hand: readonly Card[]
  readonly melds: readonly Meld[]
}

export type GameEvent =
  | { readonly type: "drew"; readonly playerId: PlayerId }
  | {
      readonly type: "laidDown"
      readonly playerId: PlayerId
      readonly rank: Rank
      readonly count: number
      readonly completed: boolean
    }
  | {
      readonly type: "tookFromTable"
      readonly playerId: PlayerId
      readonly rank: Rank
      readonly count: number
      readonly tableCount: number
      readonly completed: boolean
    }
  | {
      readonly type: "stole"
      readonly playerId: PlayerId
      readonly targetId: PlayerId
      readonly rank: Rank
      readonly stolenCount: number
      readonly completed: boolean
    }
  | { readonly type: "discarded"; readonly playerId: PlayerId; readonly card: Card }
  | { readonly type: "handRefilled"; readonly playerId: PlayerId; readonly count: number }
  | { readonly type: "tableReplenished"; readonly count: number }
  | { readonly type: "pileRecycled"; readonly count: number }
  | { readonly type: "turnTimedOut"; readonly playerId: PlayerId }
  | { readonly type: "playerLeft"; readonly playerId: PlayerId; readonly returnedCount: number }

export interface Turn {
  readonly number: number
  readonly playerId: PlayerId
  readonly usedActions: readonly TurnActionKind[]
}

export type GameEndReason = "allQuadsComplete" | "abandoned"

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

export const isComplete = (meld: Meld): boolean => meld.cards.length === QUAD_SIZE

export const countCompleteMelds = (player: GamePlayer): number =>
  player.melds.filter(isComplete).length

export const isEveryQuadComplete = (players: readonly GamePlayer[]): boolean =>
  players.reduce((total, player) => total + countCompleteMelds(player), 0) === TOTAL_QUADS

export const findWinnerIds = (players: readonly GamePlayer[]): readonly PlayerId[] => {
  const best = Math.max(...players.map(countCompleteMelds))
  return players.filter((player) => countCompleteMelds(player) === best).map(({ id }) => id)
}

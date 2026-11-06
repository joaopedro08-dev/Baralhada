import type { Card } from "../../cards/card.js"
import type { PlayerId } from "../../shared/seat.js"

export type { PlayerId }

export const TRES_TRINCAS_ID = "tres-trincas"
export const PLAYER_COUNTS = [2, 3, 4] as const
export const MIN_PLAYERS = 2
export const HAND_SIZE = 7
export const SET_SIZE = 3
export const SETS_TO_WIN = 3
export const TURN_DURATION_MS = 30_000
export const WIN_PAUSE_MS = 2400
export const EVENT_LOG_LIMIT = 200

export type CardSet = readonly Card[]

export interface TrincaPlayer {
  readonly id: PlayerId
  readonly hand: readonly Card[]
  readonly sets: readonly CardSet[]
}

export type TurnStage = "start" | "drawn"

export interface TrincaTurn {
  readonly number: number
  readonly playerId: PlayerId
  readonly stage: TurnStage
}

export type TrincaEvent =
  | { readonly type: "dealt"; readonly vira: Card }
  | { readonly type: "drew"; readonly playerId: PlayerId }
  | { readonly type: "discarded"; readonly playerId: PlayerId; readonly card: Card }
  | { readonly type: "melded"; readonly playerId: PlayerId; readonly sets: readonly CardSet[] }
  | { readonly type: "restocked"; readonly count: number }
  | { readonly type: "timedOut"; readonly playerId: PlayerId }
  | { readonly type: "playerLeft"; readonly playerId: PlayerId; readonly returnedCount: number }
  | { readonly type: "won"; readonly playerId: PlayerId }

export type TrincaEndReason = "sets" | "abandoned"

export interface TrincaGame {
  readonly nicknames: Readonly<Record<PlayerId, string>>
  readonly players: readonly TrincaPlayer[]
  readonly vira: Card
  readonly stock: readonly Card[]
  readonly discard: readonly Card[]
  readonly turn: TrincaTurn
  readonly events: readonly TrincaEvent[]
  readonly endReason: TrincaEndReason | null
  readonly winnerId: PlayerId | null
}

export const isFinished = (game: TrincaGame): boolean => game.endReason !== null

export const findPlayer = (game: TrincaGame, playerId: PlayerId): TrincaPlayer | undefined =>
  game.players.find((player) => player.id === playerId)

export const getPlayer = (game: TrincaGame, playerId: PlayerId): TrincaPlayer => {
  const player = findPlayer(game, playerId)
  if (!player) throw new Error(`Unknown player ${playerId}`)
  return player
}

export const replacePlayer = (
  players: readonly TrincaPlayer[],
  updated: TrincaPlayer
): readonly TrincaPlayer[] => players.map((player) => (player.id === updated.id ? updated : player))

export const seatAfter = (players: readonly TrincaPlayer[], playerId: PlayerId): PlayerId => {
  const index = players.findIndex((player) => player.id === playerId)
  return (players[(index + 1) % players.length] as TrincaPlayer).id
}

export const withEvents = (game: TrincaGame, ...added: readonly TrincaEvent[]): TrincaGame => ({
  ...game,
  events: [...game.events, ...added].slice(-EVENT_LOG_LIMIT),
})

export const withoutCards = (
  hand: readonly Card[],
  cards: readonly Card[]
): readonly Card[] | null => {
  const picked = new Set(cards)
  const holdsAll = picked.size === cards.length && cards.every((card) => hand.includes(card))
  return holdsAll ? hand.filter((card) => !picked.has(card)) : null
}

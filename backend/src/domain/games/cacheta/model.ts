import type { Card } from "../../cards/card.js"
import type { PlayerId } from "../../shared/seat.js"

export type { PlayerId }

export const CACHETA_ID = "cacheta"
export const PLAYER_COUNTS = [2, 3, 4] as const
export const MIN_PLAYERS = 2
export const DECK_COUNT = 2
export const HAND_SIZE = 9
export const STARTING_POINTS = 10
export const KNOCK_LOSS = 1
export const CLEAN_KNOCK_LOSS = 2
export const MIN_MELD_SIZE = 3
export const MAX_JOKERS_PER_MELD = 2
export const TURN_DURATION_MS = 30_000
export const KNOCK_PAUSE_MS = 6500
export const DEAL_PAUSE_MS = 1400
export const EVENT_LOG_LIMIT = 200

export type MeldKind = "trinca" | "sequencia"

export interface Meld {
  readonly kind: MeldKind
  readonly cards: readonly Card[]
  readonly jokers: readonly boolean[]
}

export type PlayerStatus = "playing" | "out" | "left"

export interface CachetaPlayer {
  readonly id: PlayerId
  readonly hand: readonly Card[]
  readonly points: number
  readonly status: PlayerStatus
}

export type TurnStage = "start" | "drawn"

export interface CachetaTurn {
  readonly number: number
  readonly playerId: PlayerId
  readonly stage: TurnStage
  readonly drawn: Card | null
}

export interface PointLoss {
  readonly playerId: PlayerId
  readonly before: number
  readonly after: number
}

export interface RoundResult {
  readonly round: number
  readonly knockerId: PlayerId
  readonly melds: readonly Meld[]
  readonly discard: Card
  readonly clean: boolean
  readonly losses: readonly PointLoss[]
  readonly eliminatedIds: readonly PlayerId[]
}

export type CachetaEvent =
  | { readonly type: "dealt"; readonly round: number; readonly vira: Card }
  | { readonly type: "drew"; readonly playerId: PlayerId }
  | { readonly type: "tookDiscard"; readonly playerId: PlayerId; readonly card: Card }
  | { readonly type: "discarded"; readonly playerId: PlayerId; readonly card: Card }
  | { readonly type: "knocked"; readonly playerId: PlayerId; readonly clean: boolean }
  | { readonly type: "eliminated"; readonly playerId: PlayerId }
  | { readonly type: "restocked"; readonly count: number }
  | { readonly type: "timedOut"; readonly playerId: PlayerId }
  | { readonly type: "playerLeft"; readonly playerId: PlayerId; readonly returnedCount: number }
  | { readonly type: "won"; readonly playerId: PlayerId }

export type CachetaEndReason = "knockout" | "abandoned"

export type PendingStep = "nextRound"

export interface CachetaGame {
  readonly nicknames: Readonly<Record<PlayerId, string>>
  readonly players: readonly CachetaPlayer[]
  readonly round: number
  readonly starterId: PlayerId
  readonly vira: Card
  readonly stock: readonly Card[]
  readonly discard: readonly Card[]
  readonly turn: CachetaTurn
  readonly pending: PendingStep | null
  readonly lastRound: RoundResult | null
  readonly eliminations: readonly PlayerId[]
  readonly events: readonly CachetaEvent[]
  readonly endReason: CachetaEndReason | null
  readonly winnerId: PlayerId | null
}

export const isFinished = (game: CachetaGame): boolean => game.endReason !== null

export const isPlaying = (player: CachetaPlayer): boolean => player.status === "playing"

export const findPlayer = (game: CachetaGame, playerId: PlayerId): CachetaPlayer | undefined =>
  game.players.find((player) => player.id === playerId)

export const getPlayer = (game: CachetaGame, playerId: PlayerId): CachetaPlayer => {
  const player = findPlayer(game, playerId)
  if (!player) throw new Error(`Unknown player ${playerId}`)
  return player
}

export const playingOf = (game: CachetaGame): readonly CachetaPlayer[] =>
  game.players.filter(isPlaying)

export const replacePlayer = (game: CachetaGame, updated: CachetaPlayer): CachetaGame => ({
  ...game,
  players: game.players.map((player) => (player.id === updated.id ? updated : player)),
})

export const nextPlayingAfter = (game: CachetaGame, playerId: PlayerId): PlayerId => {
  const start = game.players.findIndex((player) => player.id === playerId)
  for (let step = 1; step <= game.players.length; step++) {
    const candidate = game.players[(start + step) % game.players.length] as CachetaPlayer
    if (isPlaying(candidate)) return candidate.id
  }
  return playerId
}

export const withEvents = (game: CachetaGame, ...added: readonly CachetaEvent[]): CachetaGame => ({
  ...game,
  events: [...game.events, ...added].slice(-EVENT_LOG_LIMIT),
})

export const withoutOne = (hand: readonly Card[], card: Card): readonly Card[] | null => {
  const index = hand.indexOf(card)
  return index < 0 ? null : [...hand.slice(0, index), ...hand.slice(index + 1)]
}

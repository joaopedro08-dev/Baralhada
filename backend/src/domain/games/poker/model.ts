import type { Card } from "../../cards/card.js"
import type { PlayerId } from "../../shared/seat.js"
import type { HandCategory } from "./hand-ranking.js"

export type { PlayerId }

export const POKER_ID = "poker-texas-holdem"
export const PLAYER_COUNTS = [2, 3, 4, 5, 6] as const
export const MIN_PLAYERS = 2
export const STARTING_CHIPS = 1000
export const FIRST_SMALL_BLIND = 10
export const HANDS_PER_BLIND_LEVEL = 5
export const HOLE_CARDS = 2
export const TURN_DURATION_MS = 30_000
export const EVENT_LOG_LIMIT = 200

export const STREETS = ["preflop", "flop", "turn", "river"] as const
export type Street = (typeof STREETS)[number]

export const BOARD_SIZE: Readonly<Record<Street, number>> = {
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
}

export type PlayerStatus = "active" | "folded" | "allIn" | "out"

export interface PokerPlayer {
  readonly id: PlayerId
  readonly chips: number
  readonly hole: readonly Card[]
  readonly bet: number
  readonly committed: number
  readonly status: PlayerStatus
  readonly acted: boolean
}

export interface Blinds {
  readonly small: number
  readonly big: number
}

export interface Deal {
  readonly number: number
  readonly buttonId: PlayerId
  readonly smallBlindId: PlayerId
  readonly bigBlindId: PlayerId
  readonly blinds: Blinds
  readonly street: Street
  readonly board: readonly Card[]
  readonly deck: readonly Card[]
  readonly currentBet: number
  readonly minRaise: number
  readonly actorId: PlayerId
}

export interface Pot {
  readonly amount: number
  readonly eligibleIds: readonly PlayerId[]
}

export interface PotResult extends Pot {
  readonly winnerIds: readonly PlayerId[]
  readonly category: HandCategory | null
}

export interface ShownHand {
  readonly playerId: PlayerId
  readonly hole: readonly Card[]
  readonly category: HandCategory
  readonly cards: readonly Card[]
}

export interface HandSummary {
  readonly number: number
  readonly board: readonly Card[]
  readonly showdown: boolean
  readonly shown: readonly ShownHand[]
  readonly pots: readonly PotResult[]
  readonly winnings: Readonly<Record<PlayerId, number>>
  readonly eliminatedIds: readonly PlayerId[]
}

export type BettingMove = "fold" | "check" | "call" | "bet" | "raise"

export type PokerEvent =
  | {
      readonly type: "handStarted"
      readonly number: number
      readonly buttonId: PlayerId
      readonly blinds: Blinds
    }
  | {
      readonly type: "blindPosted"
      readonly playerId: PlayerId
      readonly amount: number
      readonly big: boolean
    }
  | {
      readonly type: "acted"
      readonly playerId: PlayerId
      readonly move: BettingMove
      readonly amount: number
      readonly allIn: boolean
    }
  | { readonly type: "streetDealt"; readonly street: Street; readonly cards: readonly Card[] }
  | {
      readonly type: "potWon"
      readonly playerIds: readonly PlayerId[]
      readonly amount: number
      readonly category: HandCategory | null
    }
  | { readonly type: "eliminated"; readonly playerId: PlayerId; readonly place: number }
  | { readonly type: "timedOut"; readonly playerId: PlayerId }
  | { readonly type: "playerLeft"; readonly playerId: PlayerId }
  | { readonly type: "matchWon"; readonly playerId: PlayerId }

export type PokerEndReason = "chips" | "abandoned"

export interface PokerGame {
  readonly nicknames: Readonly<Record<PlayerId, string>>
  readonly players: readonly PokerPlayer[]
  readonly deal: Deal
  readonly step: number
  readonly events: readonly PokerEvent[]
  readonly lastHand: HandSummary | null
  readonly eliminatedIds: readonly PlayerId[]
  readonly winnerId: PlayerId | null
  readonly endReason: PokerEndReason | null
}

export const isFinished = (game: PokerGame): boolean => game.endReason !== null

export const isInGame = (player: PokerPlayer): boolean => player.status !== "out"

export const isContender = (player: PokerPlayer): boolean =>
  player.status === "active" || player.status === "allIn"

export const findPlayer = (game: PokerGame, playerId: PlayerId): PokerPlayer | undefined =>
  game.players.find((player) => player.id === playerId)

export const getPlayer = (game: PokerGame, playerId: PlayerId): PokerPlayer => {
  const player = findPlayer(game, playerId)
  if (!player) throw new Error(`Unknown player ${playerId}`)
  return player
}

export const replacePlayer = (game: PokerGame, updated: PokerPlayer): PokerGame => ({
  ...game,
  players: game.players.map((player) => (player.id === updated.id ? updated : player)),
})

export const seatsAfter = <Seated extends { readonly id: PlayerId }>(
  players: readonly Seated[],
  playerId: PlayerId
): readonly Seated[] => {
  const index = players.findIndex((player) => player.id === playerId)
  return [...players.slice(index + 1), ...players.slice(0, index + 1)]
}

export const seatBefore = (players: readonly PokerPlayer[], playerId: PlayerId): PlayerId =>
  seatsAfter(players, playerId).at(-2)?.id ?? playerId

export const blindsFor = (handNumber: number): Blinds => {
  const level = Math.floor((handNumber - 1) / HANDS_PER_BLIND_LEVEL)
  const small = FIRST_SMALL_BLIND * 2 ** level
  return { small, big: small * 2 }
}

export const handsUntilBlindsRise = (handNumber: number): number =>
  HANDS_PER_BLIND_LEVEL - ((handNumber - 1) % HANDS_PER_BLIND_LEVEL)

export const withEvents = (game: PokerGame, ...added: readonly PokerEvent[]): PokerGame => ({
  ...game,
  events: [...game.events, ...added].slice(-EVENT_LOG_LIMIT),
})

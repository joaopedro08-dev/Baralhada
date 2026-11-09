import type { Card } from "../../cards/card.js"
import type { PlayerId } from "../../shared/seat.js"

export type { PlayerId }

export const BLACKJACK_ID = "blackjack"
export const PLAYER_COUNTS = [1, 2, 3, 4, 5, 6] as const
export const STARTING_CHIPS = 1000
export const MIN_BET = 10
export const BET_STEP = 10
export const ROUNDS = 10
export const TURN_DURATION_MS = 30_000
export const DEAL_STEP_MS = 450
export const DEAL_DONE_MS = 700
export const NATURAL_PAUSE_MS = 2200
export const HAND_CLOSE_MS = 800
export const DEALER_STEP_MS = 1000
export const SETTLE_PAUSE_MS = 4500
export const FINAL_PAUSE_MS = 7000
export const EVENT_LOG_LIMIT = 200

export type SeatStatus = "playing" | "broke"

export interface Hand {
  readonly cards: readonly Card[]
  readonly bet: number
  readonly doubled: boolean
  readonly fromSplit: boolean
  readonly done: boolean
}

export interface Seat {
  readonly id: PlayerId
  readonly chips: number
  readonly bet: number | null
  readonly insurance: boolean | null
  readonly hands: readonly Hand[]
  readonly status: SeatStatus
}

export type Phase =
  | "betting"
  | "dealing"
  | "insurance"
  | "playing"
  | "dealer"
  | "settled"

export interface Dealer {
  readonly cards: readonly Card[]
  readonly revealed: boolean
}

export interface BlackjackTurn {
  readonly number: number
  readonly playerId: PlayerId | null
  readonly handIndex: number
}

export type HandOutcome = "blackjack" | "win" | "push" | "lose" | "bust"

export interface HandResult {
  readonly playerId: PlayerId
  readonly handIndex: number
  readonly outcome: HandOutcome
  readonly bet: number
  readonly net: number
  readonly fromSplit: boolean
  readonly insuranceBet?: number
  readonly insuranceNet?: number
}

export interface RoundResult {
  readonly round: number
  readonly dealerTotal: number
  readonly dealerBlackjack: boolean
  readonly dealerBust: boolean
  readonly hands: readonly HandResult[]
}

export type BlackjackEvent =
  | { readonly type: "roundStarted"; readonly round: number }
  | { readonly type: "bet"; readonly playerId: PlayerId; readonly amount: number }
  | {
      readonly type: "insurance"
      readonly playerId: PlayerId
      readonly accepted: boolean
      readonly amount: number
    }
  | { readonly type: "dealt"; readonly round: number }
  | {
      readonly type: "hit"
      readonly playerId: PlayerId
      readonly card: Card
      readonly total: number
    }
  | { readonly type: "stood"; readonly playerId: PlayerId; readonly total: number }
  | {
      readonly type: "doubled"
      readonly playerId: PlayerId
      readonly from: number
      readonly card: Card
      readonly total: number
    }
  | { readonly type: "split"; readonly playerId: PlayerId; readonly cards: readonly Card[] }
  | { readonly type: "busted"; readonly playerId: PlayerId; readonly total: number }
  | { readonly type: "dealerRevealed"; readonly card: Card; readonly total: number }
  | { readonly type: "dealerDrew"; readonly card: Card; readonly total: number }
  | { readonly type: "settled"; readonly result: HandResult }
  | { readonly type: "restocked" }
  | { readonly type: "timedOut"; readonly playerId: PlayerId }
  | { readonly type: "broke"; readonly playerId: PlayerId }
  | { readonly type: "playerLeft"; readonly playerId: PlayerId; readonly bet: number }
  | { readonly type: "finished"; readonly winnerIds: readonly PlayerId[] }

export type BlackjackEndReason = "rounds" | "broke" | "abandoned"

export interface BlackjackGame {
  readonly nicknames: Readonly<Record<PlayerId, string>>
  readonly players: readonly Seat[]
  readonly round: number
  readonly phase: Phase
  readonly deck: readonly Card[]
  readonly dealer: Dealer
  readonly turn: BlackjackTurn
  readonly lastRound: RoundResult | null
  readonly events: readonly BlackjackEvent[]
  readonly endReason: BlackjackEndReason | null
  readonly winnerIds: readonly PlayerId[]
}

export const isFinished = (game: BlackjackGame): boolean => game.endReason !== null

export const findSeat = (game: BlackjackGame, playerId: PlayerId): Seat | undefined =>
  game.players.find((seat) => seat.id === playerId)

export const getSeat = (game: BlackjackGame, playerId: PlayerId): Seat => {
  const seat = findSeat(game, playerId)
  if (!seat) throw new Error(`Unknown player ${playerId}`)
  return seat
}

export const replaceSeat = (game: BlackjackGame, updated: Seat): BlackjackGame => ({
  ...game,
  players: game.players.map((seat) => (seat.id === updated.id ? updated : seat)),
})

export const replaceHand = (seat: Seat, index: number, hand: Hand): Seat => ({
  ...seat,
  hands: seat.hands.map((current, position) => (position === index ? hand : current)),
})

export const activeSeats = (game: BlackjackGame): readonly Seat[] =>
  game.players.filter((seat) => seat.status === "playing")

export const withEvents = (
  game: BlackjackGame,
  ...added: readonly BlackjackEvent[]
): BlackjackGame => ({
  ...game,
  events: [...game.events, ...added].slice(-EVENT_LOG_LIMIT),
})

export const currentHand = (game: BlackjackGame): Hand | undefined => {
  if (game.phase !== "playing" || game.turn.playerId === null) return undefined
  return findSeat(game, game.turn.playerId)?.hands[game.turn.handIndex]
}

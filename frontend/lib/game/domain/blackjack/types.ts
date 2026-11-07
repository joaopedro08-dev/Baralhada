import type { Card, PlayerId } from "@/lib/game/domain/types"

export type BlackjackAction =
  | { readonly type: "bet"; readonly amount: number }
  | { readonly type: "hit" }
  | { readonly type: "stand" }
  | { readonly type: "double" }
  | { readonly type: "split" }

export type Phase = "betting" | "dealing" | "playing" | "dealer" | "settled"
export type SeatStatus = "playing" | "broke"
export type HandOutcome = "blackjack" | "win" | "push" | "lose" | "bust"
export type BlackjackEndReason = "rounds" | "broke" | "abandoned"
export type Play = "hit" | "stand" | "double" | "split"

export interface BlackjackHand {
  readonly cards: readonly Card[]
  readonly bet: number
  readonly doubled: boolean
  readonly fromSplit: boolean
  readonly done: boolean
  readonly total: number
  readonly soft: boolean
}

export interface BlackjackSeat {
  readonly id: PlayerId
  readonly nickname: string
  readonly chips: number
  readonly bet: number | null
  readonly status: SeatStatus
  readonly hands: readonly BlackjackHand[]
}

export interface DealerState {
  readonly cards: readonly Card[]
  readonly hidden: number
  readonly total: number
  readonly soft: boolean
}

export interface BetRange {
  readonly min: number
  readonly max: number
  readonly step: number
}

export interface BlackjackMoves {
  readonly bet: BetRange | null
  readonly hit: boolean
  readonly stand: boolean
  readonly double: boolean
  readonly split: boolean
}

export interface HandResult {
  readonly playerId: PlayerId
  readonly handIndex: number
  readonly outcome: HandOutcome
  readonly bet: number
  readonly net: number
  readonly fromSplit: boolean
}

export interface RoundResult {
  readonly round: number
  readonly dealerTotal: number
  readonly dealerBlackjack: boolean
  readonly dealerBust: boolean
  readonly hands: readonly HandResult[]
}

export interface BlackjackState {
  readonly kind: "blackjack"
  readonly players: readonly BlackjackSeat[]
  readonly round: number
  readonly rounds: number
  readonly phase: Phase
  readonly dealer: DealerState
  readonly currentPlayerId: PlayerId | null
  readonly handIndex: number
  readonly turnNumber: number
  readonly moves: BlackjackMoves
  readonly lastRound: RoundResult | null
  readonly winnerIds: readonly PlayerId[]
  readonly endReason: BlackjackEndReason | null
  readonly history: readonly string[]
}

export interface BlackjackAdvice {
  readonly action: BlackjackAction
  readonly play: Play
  readonly sentence: string
}

export interface BlackjackHints {
  readonly kind: "blackjack"
  readonly advice: BlackjackAdvice | null
}

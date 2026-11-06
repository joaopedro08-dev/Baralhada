import type { Card, PlayerId } from "@/lib/game/domain/types"

export type PokerAction =
  | { readonly type: "fold" }
  | { readonly type: "check" }
  | { readonly type: "call" }
  | { readonly type: "bet"; readonly amount: number }
  | { readonly type: "raise"; readonly amount: number }

export type Street = "preflop" | "flop" | "turn" | "river"
export type PlayerStatus = "active" | "folded" | "allIn" | "out"
export type PokerEndReason = "chips" | "abandoned"

export type HandCategory =
  | "highCard"
  | "pair"
  | "twoPair"
  | "threeOfAKind"
  | "straight"
  | "flush"
  | "fullHouse"
  | "fourOfAKind"
  | "straightFlush"
  | "royalFlush"

export interface Blinds {
  readonly small: number
  readonly big: number
}

export interface BetRange {
  readonly min: number
  readonly max: number
}

export interface PokerMoves {
  readonly fold: boolean
  readonly check: boolean
  readonly call: number | null
  readonly bet: BetRange | null
  readonly raise: BetRange | null
}

export interface PokerPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly chips: number
  readonly bet: number
  readonly status: PlayerStatus
  readonly holeCount: number
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

export interface PokerState {
  readonly kind: "poker-texas-holdem"
  readonly hole: readonly Card[]
  readonly players: readonly PokerPlayer[]
  readonly handNumber: number
  readonly street: Street
  readonly board: readonly Card[]
  readonly buttonId: PlayerId
  readonly smallBlindId: PlayerId
  readonly bigBlindId: PlayerId
  readonly blinds: Blinds
  readonly nextBlinds: Blinds
  readonly handsUntilBlindsRise: number
  readonly pots: readonly Pot[]
  readonly potTotal: number
  readonly currentBet: number
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly moves: PokerMoves
  readonly lastHand: HandSummary | null
  readonly eliminatedIds: readonly PlayerId[]
  readonly winnerId: PlayerId | null
  readonly endReason: PokerEndReason | null
  readonly history: readonly string[]
}

export interface CurrentHand {
  readonly category: HandCategory
  readonly cards: readonly Card[]
}

export interface Outs {
  readonly total: number
  readonly unseen: number
  readonly byCategory: readonly {
    readonly category: HandCategory
    readonly count: number
  }[]
}

export interface PokerHints {
  readonly kind: "poker-texas-holdem"
  readonly current: CurrentHand | null
  readonly outs: Outs | null
  readonly sentences: readonly string[]
}

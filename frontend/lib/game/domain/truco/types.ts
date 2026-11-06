import type { Card, PlayerId, Rank, Suit } from "@/lib/game/domain/types"

export type TeamIndex = 0 | 1
export type Stake = 1 | 3 | 6 | 9 | 12
export type HandMode = "normal" | "eleven" | "iron"
export type RoundResult = TeamIndex | "tie"
export type HandEnding = "rounds" | "ran" | "elevenRan" | "tied"
export type TrucoEndReason = "score" | "abandoned"

export type TrucoAction =
  | { readonly type: "play"; readonly card: Card }
  | { readonly type: "cover"; readonly card: Card }
  | { readonly type: "playBlind"; readonly slot: number }
  | { readonly type: "raise" }
  | { readonly type: "accept" }
  | { readonly type: "run" }
  | { readonly type: "show" }

export interface TrucoPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly team: TeamIndex
  readonly handSize: number
}

export interface PlayedCard {
  readonly playerId: PlayerId
  readonly card: Card | null
  readonly covered: boolean
}

export interface RaiseRequest {
  readonly requesterId: PlayerId
  readonly responderId: PlayerId
  readonly stake: Stake
}

export interface TrucoMoves {
  readonly play: boolean
  readonly raiseTo: Stake | null
  readonly answer: boolean
  readonly decideEleven: boolean
  readonly cover: boolean
  readonly fold: boolean
}

export interface ShownHand {
  readonly playerId: PlayerId
  readonly cards: readonly Card[] | null
  readonly shown: boolean
}

export interface RoundSummary {
  readonly handNumber: number
  readonly round: number
  readonly table: readonly PlayedCard[]
  readonly result: RoundResult
  readonly winnerId: PlayerId | null
}

export interface HandSummary {
  readonly number: number
  readonly winnerTeam: TeamIndex | null
  readonly points: number
  readonly ending: HandEnding
  readonly table: readonly PlayedCard[]
  readonly rounds: readonly RoundResult[]
  readonly runner: ShownHand | null
}

export interface TrucoState {
  readonly kind: "truco-paulista"
  readonly viewerTeam: TeamIndex | null
  readonly hand: readonly Card[]
  readonly handSize: number
  readonly blind: boolean
  readonly partnerHands: readonly {
    readonly playerId: PlayerId
    readonly cards: readonly Card[]
  }[]
  readonly players: readonly TrucoPlayer[]
  readonly scores: readonly [number, number]
  readonly handNumber: number
  readonly mode: HandMode
  readonly vira: Card
  readonly manilha: Rank
  readonly stake: Stake
  readonly table: readonly PlayedCard[]
  readonly rounds: readonly RoundResult[]
  readonly currentPlayerId: PlayerId
  readonly actorId: PlayerId
  readonly request: RaiseRequest | null
  readonly elevenDeciderId: PlayerId | null
  readonly moves: TrucoMoves
  readonly lastHand: HandSummary | null
  readonly lastRound: RoundSummary | null
  readonly canShowHand: boolean
  readonly winnerTeam: TeamIndex | null
  readonly endReason: TrucoEndReason | null
  readonly turnNumber: number
  readonly history: readonly string[]
}

export interface TrucoHints {
  readonly kind: "truco-paulista"
  readonly order: readonly Rank[]
  readonly manilha: Rank
  readonly manilhaSuits: readonly Suit[]
  readonly hand: readonly {
    readonly card: Card
    readonly position: number
    readonly manilha: boolean
  }[]
  readonly suggestions: readonly {
    readonly action: TrucoAction
    readonly sentence: string
  }[]
}

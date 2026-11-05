export const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const
export const SUITS = ["C", "D", "H", "S"] as const

export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]
export type Card = `${Rank}${Suit}`
export type PlayerId = string

export type TurnAction =
  | {
      readonly type: "capture"
      readonly card: Card
      readonly tableCards: readonly Card[]
    }
  | { readonly type: "stack"; readonly card: Card }
  | {
      readonly type: "steal"
      readonly card: Card
      readonly targetId: PlayerId
    }
  | { readonly type: "discard"; readonly card: Card }
  | { readonly type: "draw" }
  | { readonly type: "pass" }

export type TurnActionKind = TurnAction["type"]

export type GameEndReason = "noPlaysLeft" | "handsEmpty" | "abandoned"
export type RoomStatus = "lobby" | "playing" | "finished"

export interface RoomPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly connected: boolean
}

export interface GamePlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly handSize: number
  readonly pileSize: number
  readonly pileTop: Card | null
}

export interface GameState {
  readonly hand: readonly Card[]
  readonly table: readonly Card[]
  readonly deckSize: number
  readonly players: readonly GamePlayer[]
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly drewThisTurn: boolean
  readonly canPass: boolean
  readonly endReason: GameEndReason | null
  readonly winnerIds: readonly PlayerId[]
  readonly history: readonly string[]
}

export interface RoomState {
  readonly code: string
  readonly version: number
  readonly status: RoomStatus
  readonly hostId: PlayerId | null
  readonly viewerId: PlayerId
  readonly canStart: boolean
  readonly players: readonly RoomPlayer[]
  readonly turnDeadlineAt: number | null
  readonly matchStartsAt: number | null
  readonly serverNow: number
  readonly game: GameState | null
}

export interface SuggestedPlay {
  readonly action: TurnAction
  readonly sentence: string
}

export interface Hints {
  readonly plays: readonly SuggestedPlay[]
  readonly highlights: {
    readonly handCards: readonly Card[]
    readonly tableCards: readonly Card[]
    readonly piles: readonly PlayerId[]
  }
  readonly risk: {
    readonly rank: Rank
    readonly pileSize: number
    readonly unseenCards: number
    readonly sentence: string
  } | null
  readonly cardCounts: readonly {
    readonly rank: Rank
    readonly visible: number
    readonly missing: number
  }[]
}

export interface Seat {
  readonly code: string
  readonly nickname: string
  readonly playerId: PlayerId
  readonly reconnectToken: string
  readonly inviteUrl: string
}

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

export type TurnActionKind =
  "draw" | "layDown" | "takeFromTable" | "steal" | "discard"

export type TurnAction =
  | { readonly type: "draw" }
  | { readonly type: "layDown"; readonly cards: readonly Card[] }
  | {
      readonly type: "takeFromTable"
      readonly tableCards: readonly Card[]
      readonly handCards: readonly Card[]
    }
  | {
      readonly type: "steal"
      readonly targetId: PlayerId
      readonly rank: Rank
      readonly handCards: readonly Card[]
    }
  | { readonly type: "discard"; readonly card: Card }

export interface Meld {
  readonly rank: Rank
  readonly cards: readonly Card[]
}

export type GameEndReason = "allQuadsComplete" | "abandoned"
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
  readonly melds: readonly Meld[]
}

export interface GameState {
  readonly hand: readonly Card[]
  readonly table: readonly Card[]
  readonly deckSize: number
  readonly players: readonly GamePlayer[]
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly usedActions: readonly TurnActionKind[]
  readonly canEndTurn: boolean
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
  readonly game: GameState | null
}

export interface MeldTarget {
  readonly playerId: PlayerId
  readonly rank: Rank
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
    readonly stealableMelds: readonly MeldTarget[]
  }
  readonly risks: readonly {
    readonly rank: Rank
    readonly unseenCards: number
    readonly sentence: string
  }[]
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

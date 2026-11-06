import type {
  TresTrincasHints,
  TresTrincasState,
  TrincaAction,
} from "@/lib/game/domain/tres-trincas/types"
import type {
  TrucoAction,
  TrucoHints,
  TrucoState,
} from "@/lib/game/domain/truco/types"

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
export type GameId = "rouba-monte" | "truco-paulista" | "tres-trincas"

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
  readonly kind: "rouba-monte"
  readonly hand: readonly Card[]
  readonly table: readonly Card[]
  readonly deckSize: number
  readonly players: readonly GamePlayer[]
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly drewThisTurn: boolean
  readonly endReason: GameEndReason | null
  readonly winnerIds: readonly PlayerId[]
  readonly history: readonly string[]
}

export type StartProblem =
  "GAME_ALREADY_STARTED" | "NOT_ENOUGH_PLAYERS" | "TEAMS_UNBALANCED"

export interface RoomState {
  readonly code: string
  readonly version: number
  readonly gameId: GameId
  readonly status: RoomStatus
  readonly hostId: PlayerId | null
  readonly viewerId: PlayerId
  readonly canStart: boolean
  readonly startProblem: StartProblem | null
  readonly players: readonly RoomPlayer[]
  readonly teams: readonly (readonly PlayerId[])[] | null
  readonly hintsAllowed: boolean
  readonly turnDurationMs: number
  readonly turnDeadlineAt: number | null
  readonly matchStartsAt: number | null
  readonly pausedUntil: number | null
  readonly serverNow: number
  readonly game: GameState | TrucoState | TresTrincasState | null
}

export interface SuggestedPlay {
  readonly action: TurnAction
  readonly sentence: string
}

export interface Hints {
  readonly kind: "rouba-monte"
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

export type AnyAction = TurnAction | TrucoAction | TrincaAction

export type AnyHints = Hints | TrucoHints | TresTrincasHints

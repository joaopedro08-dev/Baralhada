import type { Card, PlayerId, Rank } from "@/lib/game/domain/types"

export type CachetaAction =
  | { readonly type: "draw" }
  | { readonly type: "take" }
  | { readonly type: "discard"; readonly card: Card }
  | { readonly type: "knock"; readonly card: Card }

export type MeldKind = "trinca" | "sequencia"

export interface Meld {
  readonly kind: MeldKind
  readonly cards: readonly Card[]
  readonly jokers: readonly boolean[]
}

export type PlayerStatus = "playing" | "out" | "left"
export type TurnStage = "start" | "drawn"
export type CachetaEndReason = "knockout" | "abandoned"

export interface CachetaPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly handSize: number
  readonly points: number
  readonly status: PlayerStatus
}

export interface CachetaMoves {
  readonly draw: boolean
  readonly take: boolean
  readonly discard: boolean
  readonly knock: boolean
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

export interface CachetaState {
  readonly kind: "cacheta"
  readonly hand: readonly Card[]
  readonly drawnCard: Card | null
  readonly players: readonly CachetaPlayer[]
  readonly round: number
  readonly vira: Card
  readonly wildRank: Rank
  readonly stockSize: number
  readonly discardTop: Card | null
  readonly discardSize: number
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly stage: TurnStage
  readonly pending: "nextRound" | null
  readonly moves: CachetaMoves
  readonly lastRound: RoundResult | null
  readonly eliminations: readonly PlayerId[]
  readonly winnerId: PlayerId | null
  readonly endReason: CachetaEndReason | null
  readonly history: readonly string[]
}

export interface Knock {
  readonly discard: Card
  readonly melds: readonly Meld[]
  readonly clean: boolean
}

export interface CachetaSuggestion {
  readonly action: CachetaAction
  readonly sentence: string
}

export interface CachetaHints {
  readonly kind: "cacheta"
  readonly ready: readonly Meld[]
  readonly knock: Knock | null
  readonly suggestions: readonly CachetaSuggestion[]
}

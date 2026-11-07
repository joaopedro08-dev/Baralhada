import type { Card, Rank } from "../../../../domain/cards/card.js"
import type { CachetaAction } from "../../../../domain/games/cacheta/actions.js"
import type { Knock } from "../../../../domain/games/cacheta/melds.js"
import type {
  CachetaEndReason,
  Meld,
  PendingStep,
  PlayerId,
  RoundResult,
  TurnStage,
} from "../../../../domain/games/cacheta/model.js"
import type {
  CachetaMoves,
  CachetaPublicPlayer,
} from "../../../../domain/games/cacheta/player-view.js"

export interface CachetaStateDto {
  readonly kind: "cacheta"
  readonly hand: readonly Card[]
  readonly drawnCard: Card | null
  readonly players: readonly CachetaPublicPlayer[]
  readonly round: number
  readonly vira: Card
  readonly wildRank: Rank
  readonly stockSize: number
  readonly discardTop: Card | null
  readonly discardSize: number
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly stage: TurnStage
  readonly pending: PendingStep | null
  readonly moves: CachetaMoves
  readonly lastRound: RoundResult | null
  readonly eliminations: readonly PlayerId[]
  readonly winnerId: PlayerId | null
  readonly endReason: CachetaEndReason | null
  readonly history: readonly string[]
}

export interface CachetaSuggestionDto {
  readonly action: CachetaAction
  readonly sentence: string
}

export interface CachetaHintsDto {
  readonly kind: "cacheta"
  readonly ready: readonly Meld[]
  readonly knock: Knock | null
  readonly suggestions: readonly CachetaSuggestionDto[]
}

import type { Card } from "../../../../domain/cards/card.js"
import type { TrucoAction } from "../../../../domain/games/truco/actions.js"
import type { ManilhaSuit, TrucoRank } from "../../../../domain/games/truco/cards.js"
import type {
  HandMode,
  PlayerId,
  RaiseRequest,
  RoundResult,
  Scores,
  Stake,
  TeamIndex,
  TrucoEndReason,
} from "../../../../domain/games/truco/model.js"
import type {
  HandSummaryView,
  PartnerHand,
  RoundSummaryView,
  TrucoMoves,
  TrucoPublicPlayer,
  VisiblePlay,
} from "../../../../domain/games/truco/player-view.js"

export interface TrucoStateDto {
  readonly kind: "truco-paulista"
  readonly viewerTeam: TeamIndex | null
  readonly hand: readonly Card[]
  readonly handSize: number
  readonly blind: boolean
  readonly partnerHands: readonly PartnerHand[]
  readonly players: readonly TrucoPublicPlayer[]
  readonly scores: Scores
  readonly handNumber: number
  readonly mode: HandMode
  readonly vira: Card
  readonly manilha: TrucoRank
  readonly stake: Stake
  readonly table: readonly VisiblePlay[]
  readonly rounds: readonly RoundResult[]
  readonly currentPlayerId: PlayerId
  readonly actorId: PlayerId
  readonly request: RaiseRequest | null
  readonly elevenDeciderId: PlayerId | null
  readonly moves: TrucoMoves
  readonly lastHand: HandSummaryView | null
  readonly lastRound: RoundSummaryView | null
  readonly canShowHand: boolean
  readonly winnerTeam: TeamIndex | null
  readonly endReason: TrucoEndReason | null
  readonly turnNumber: number
  readonly history: readonly string[]
}

export interface TrucoSuggestionDto {
  readonly action: TrucoAction
  readonly sentence: string
}

export interface TrucoHintsDto {
  readonly kind: "truco-paulista"
  readonly order: readonly TrucoRank[]
  readonly manilha: TrucoRank
  readonly manilhaSuits: readonly ManilhaSuit[]
  readonly hand: readonly {
    readonly card: Card
    readonly position: number
    readonly manilha: boolean
  }[]
  readonly suggestions: readonly TrucoSuggestionDto[]
}

import type { BlackjackAction } from "../../../../domain/games/blackjack/actions.js"
import type {
  BlackjackEndReason,
  Phase,
  PlayerId,
  RoundResult,
} from "../../../../domain/games/blackjack/model.js"
import type {
  BlackjackMoves,
  BlackjackSeatView,
  DealerView,
} from "../../../../domain/games/blackjack/player-view.js"
import type { Play } from "../../../../domain/games/blackjack/strategy.js"

export interface BlackjackStateDto {
  readonly kind: "blackjack"
  readonly players: readonly BlackjackSeatView[]
  readonly round: number
  readonly rounds: number
  readonly phase: Phase
  readonly dealer: DealerView
  readonly currentPlayerId: PlayerId | null
  readonly handIndex: number
  readonly turnNumber: number
  readonly moves: BlackjackMoves
  readonly lastRound: RoundResult | null
  readonly winnerIds: readonly PlayerId[]
  readonly endReason: BlackjackEndReason | null
  readonly history: readonly string[]
}

export interface BlackjackAdviceDto {
  readonly action: BlackjackAction
  readonly play: Play
  readonly sentence: string
}

export interface BlackjackHintsDto {
  readonly kind: "blackjack"
  readonly advice: BlackjackAdviceDto | null
}

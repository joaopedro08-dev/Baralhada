import type { Card, Rank } from "../../../../domain/cards/card.js"
import type { TrincaAction } from "../../../../domain/games/tres-trincas/actions.js"
import type { HandGroup } from "../../../../domain/games/tres-trincas/hints.js"
import type {
  CardSet,
  PlayerId,
  TrincaEndReason,
  TurnStage,
} from "../../../../domain/games/tres-trincas/model.js"
import type {
  TrincaMoves,
  TrincaPublicPlayer,
} from "../../../../domain/games/tres-trincas/player-view.js"

export interface TresTrincasStateDto {
  readonly kind: "tres-trincas"
  readonly hand: readonly Card[]
  readonly players: readonly TrincaPublicPlayer[]
  readonly vira: Card
  readonly deadRank: Rank
  readonly wildRank: Rank
  readonly stockSize: number
  readonly discardTop: Card | null
  readonly discardSize: number
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly stage: TurnStage
  readonly moves: TrincaMoves
  readonly winnerId: PlayerId | null
  readonly endReason: TrincaEndReason | null
  readonly history: readonly string[]
}

export interface TresTrincasSuggestionDto {
  readonly action: TrincaAction
  readonly sentence: string
}

export interface TresTrincasHintsDto {
  readonly kind: "tres-trincas"
  readonly groups: readonly HandGroup[]
  readonly ready: readonly CardSet[]
  readonly suggestions: readonly TresTrincasSuggestionDto[]
}

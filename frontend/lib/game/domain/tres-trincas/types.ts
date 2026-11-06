import type { Card, PlayerId, Rank } from "@/lib/game/domain/types"

export type CardSet = readonly Card[]

export type TrincaAction =
  | { readonly type: "draw" }
  | { readonly type: "discard"; readonly card: Card }
  | { readonly type: "meld"; readonly cards: readonly Card[] }

export type TurnStage = "start" | "drawn"
export type TrincaEndReason = "sets" | "abandoned"

export interface TrincaPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly handSize: number
  readonly sets: readonly CardSet[]
}

export interface TrincaMoves {
  readonly draw: boolean
  readonly discard: boolean
  readonly meldLimit: number
}

export interface TresTrincasState {
  readonly kind: "tres-trincas"
  readonly hand: readonly Card[]
  readonly players: readonly TrincaPlayer[]
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

export type CardRole = "natural" | "wild" | "dead"

export interface HandGroup {
  readonly rank: Rank
  readonly role: CardRole
  readonly cards: readonly Card[]
}

export interface TrincaSuggestion {
  readonly action: TrincaAction
  readonly sentence: string
}

export interface TresTrincasHints {
  readonly kind: "tres-trincas"
  readonly groups: readonly HandGroup[]
  readonly ready: readonly CardSet[]
  readonly suggestions: readonly TrincaSuggestion[]
}

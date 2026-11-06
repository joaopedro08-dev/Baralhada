import type { Card, Rank } from "../../../../domain/cards/card.js"
import type { GameEndReason, PlayerId } from "../../../../domain/games/rouba-monte/model.js"
import type { TurnAction } from "../../../../domain/games/rouba-monte/turn-actions.js"

export interface RoubaMontePlayerDto {
  readonly id: PlayerId
  readonly nickname: string
  readonly handSize: number
  readonly pileSize: number
  readonly pileTop: Card | null
}

export interface RoubaMonteStateDto {
  readonly kind: "rouba-monte"
  readonly hand: readonly Card[]
  readonly table: readonly Card[]
  readonly deckSize: number
  readonly players: readonly RoubaMontePlayerDto[]
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly drewThisTurn: boolean
  readonly endReason: GameEndReason | null
  readonly winnerIds: readonly PlayerId[]
  readonly history: readonly string[]
}

export interface RoubaMontePlayDto {
  readonly action: TurnAction
  readonly sentence: string
}

export interface RoubaMonteHintsDto {
  readonly kind: "rouba-monte"
  readonly plays: readonly RoubaMontePlayDto[]
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

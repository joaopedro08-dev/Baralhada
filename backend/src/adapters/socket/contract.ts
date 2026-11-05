import type { Card, Rank } from "../../domain/cards/card.js"
import type { GameEndReason, PlayerId } from "../../domain/games/rouba-monte/model.js"
import type { RoomStatus } from "../../domain/room/room.js"
import type { RemovalReason } from "../../application/ports.js"
import type { TurnAction } from "../../domain/games/rouba-monte/turn-actions.js"

export type AckError = { readonly code: string; readonly message: string }

export type Ack<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: AckError }

export interface SeatDto {
  readonly code: string
  readonly playerId: PlayerId
  readonly reconnectToken: string
  readonly inviteUrl: string
}

export interface RoomPlayerDto {
  readonly id: PlayerId
  readonly nickname: string
  readonly connected: boolean
}

export interface GamePlayerDto {
  readonly id: PlayerId
  readonly nickname: string
  readonly handSize: number
  readonly pileSize: number
  readonly pileTop: Card | null
}

export interface GameStateDto {
  readonly hand: readonly Card[]
  readonly table: readonly Card[]
  readonly deckSize: number
  readonly players: readonly GamePlayerDto[]
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly endReason: GameEndReason | null
  readonly winnerIds: readonly PlayerId[]
  readonly history: readonly string[]
}

export interface RoomStateDto {
  readonly code: string
  readonly version: number
  readonly status: RoomStatus
  readonly hostId: PlayerId | null
  readonly viewerId: PlayerId
  readonly canStart: boolean
  readonly players: readonly RoomPlayerDto[]
  readonly turnDeadlineAt: number | null
  readonly matchStartsAt: number | null
  readonly serverNow: number
  readonly game: GameStateDto | null
}

export interface PlayDto {
  readonly action: TurnAction
  readonly sentence: string
}

export interface HintsDto {
  readonly plays: readonly PlayDto[]
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

export interface ClientCommands {
  "room:create": { input: { nickname: string }; output: SeatDto }
  "room:join": { input: { code: string; nickname: string }; output: SeatDto }
  "room:reconnect": {
    input: { code: string; nickname: string; reconnectToken: string }
    output: SeatDto
  }
  "room:leave": { input: undefined; output: null }
  "room:kick": { input: { playerId: PlayerId }; output: null }
  "game:start": { input: undefined; output: null }
  "game:action": { input: TurnAction; output: null }
  "game:hints": { input: undefined; output: HintsDto }
}

export type ClientCommand = keyof ClientCommands

export interface ServerEvents {
  "room:state": RoomStateDto
  "room:removed": { readonly reason: RemovalReason }
}

export type ServerEvent = keyof ServerEvents

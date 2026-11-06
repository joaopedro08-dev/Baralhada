import type { RemovalReason } from "../../application/ports.js"
import type { RoomStatus, StartProblem } from "../../domain/room/room.js"
import type { PlayerId } from "../../domain/shared/seat.js"
import type { PokerHintsDto, PokerStateDto } from "./games/poker/contract.js"
import type { RoubaMonteHintsDto, RoubaMonteStateDto } from "./games/rouba-monte/contract.js"
import type { TresTrincasHintsDto, TresTrincasStateDto } from "./games/tres-trincas/contract.js"
import type { TrucoHintsDto, TrucoStateDto } from "./games/truco/contract.js"

export type AckError = { readonly code: string; readonly message: string }

export type Ack<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: AckError }

export type GameStateDto = RoubaMonteStateDto | TrucoStateDto | TresTrincasStateDto | PokerStateDto

export type HintsDto = RoubaMonteHintsDto | TrucoHintsDto | TresTrincasHintsDto | PokerHintsDto

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

export interface RoomStateDto {
  readonly code: string
  readonly version: number
  readonly gameId: string
  readonly status: RoomStatus
  readonly hostId: PlayerId | null
  readonly viewerId: PlayerId
  readonly canStart: boolean
  readonly startProblem: StartProblem | null
  readonly players: readonly RoomPlayerDto[]
  readonly teams: readonly (readonly PlayerId[])[] | null
  readonly hintsAllowed: boolean
  readonly turnDurationMs: number
  readonly turnDeadlineAt: number | null
  readonly matchStartsAt: number | null
  readonly pausedUntil: number | null
  readonly serverNow: number
  readonly game: GameStateDto | null
}

export interface ClientCommands {
  "room:create": { input: { nickname: string; gameId?: string }; output: SeatDto }
  "room:join": { input: { code: string; nickname: string }; output: SeatDto }
  "room:reconnect": {
    input: { code: string; nickname: string; reconnectToken: string }
    output: SeatDto
  }
  "room:leave": { input: undefined; output: null }
  "room:kick": { input: { playerId: PlayerId }; output: null }
  "room:game": { input: { gameId: string }; output: null }
  "room:team": { input: { playerId: PlayerId; team: number }; output: null }
  "room:teams-draw": { input: undefined; output: null }
  "room:hints": { input: { allowed: boolean }; output: null }
  "game:start": { input: undefined; output: null }
  "game:action": { input: unknown; output: null }
  "game:hints": { input: undefined; output: HintsDto }
}

export type ClientCommand = keyof ClientCommands

export interface ServerEvents {
  "room:state": RoomStateDto
  "room:removed": { readonly reason: RemovalReason }
}

export type ServerEvent = keyof ServerEvents

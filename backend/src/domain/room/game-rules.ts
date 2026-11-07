import type { RandomSource } from "../shared/random.js"
import type { Result } from "../shared/result.js"
import type { PlayerId, Seat } from "../shared/seat.js"

export interface TurnInfo {
  readonly number: number
  readonly playerId: PlayerId
  readonly automatic?: boolean
}

export interface GameFormat {
  readonly playerCounts: readonly number[]
  readonly teamCount: number | null
  readonly turnDurationMs: number
}

export interface GameRules<State, Action, ErrorCode extends string> extends GameFormat {
  readonly id: string
  start(seats: readonly Seat[], starterId: PlayerId, random: RandomSource): Result<State, ErrorCode>
  play(
    state: State,
    playerId: PlayerId,
    action: Action,
    random: RandomSource
  ): Result<State, ErrorCode>
  expireTurn(state: State, random: RandomSource): State
  removePlayer(state: State, playerId: PlayerId, random: RandomSource): State
  turnOf(state: State): TurnInfo
  isFinished(state: State): boolean
  pauseAfter?(previous: State, next: State): number
  playsDuringPause?(action: Action): boolean
}

export type AnyGameRules = GameRules<unknown, unknown, string>

export const maxPlayersOf = (format: GameFormat): number => Math.max(...format.playerCounts)

export const acceptsPlayerCount = (format: GameFormat, count: number): boolean =>
  format.playerCounts.includes(count)

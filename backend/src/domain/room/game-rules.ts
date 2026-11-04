import type { RandomSource } from "../shared/random.js"
import type { Result } from "../shared/result.js"
import type { PlayerId, Seat } from "../shared/seat.js"

export interface TurnInfo {
  readonly number: number
  readonly playerId: PlayerId
}

export interface PlayerLimits {
  readonly minPlayers: number
  readonly maxPlayers: number
}

export interface GameRules<State, Action, ErrorCode extends string> extends PlayerLimits {
  readonly id: string
  start(seats: readonly Seat[], starterId: PlayerId, random: RandomSource): Result<State, ErrorCode>
  play(
    state: State,
    playerId: PlayerId,
    action: Action,
    random: RandomSource
  ): Result<State, ErrorCode>
  pass(state: State, playerId: PlayerId, random: RandomSource): Result<State, ErrorCode>
  expireTurn(state: State, random: RandomSource): State
  removePlayer(state: State, playerId: PlayerId, random: RandomSource): State
  turnOf(state: State): TurnInfo
  isFinished(state: State): boolean
}

export type AnyGameRules = GameRules<unknown, unknown, string>

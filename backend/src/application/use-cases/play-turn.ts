import { ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { RandomSource } from "../../domain/shared/random.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export type ActionDecoder<DecodeError extends string> = (
  gameId: string
) => Result<unknown, DecodeError>

export class PlayTurn {
  constructor(
    private readonly session: RoomSession,
    private readonly random: RandomSource
  ) {}

  perform<DecodeError extends string>(
    actor: Actor,
    decode: ActionDecoder<DecodeError>
  ): Result<null, ApplicationErrorCode<string> | DecodeError> {
    const member = this.session.loadAsMember(actor)
    if (!member.ok) return member
    const action = decode(member.value.gameId)
    if (!action.ok) return action
    const ruleset = this.session.rulesOf(member.value)
    const duringPause = ruleset.playsDuringPause?.(action.value) ?? false
    const running = this.session.loadPlayableGame(actor, duringPause)
    if (!running.ok) return running
    const { room, game, rules } = running.value
    const next = rules.play(game, actor.playerId, action.value, this.random)
    if (!next.ok) return next
    this.session.commit(this.session.advance(room, next.value))
    return ok(null)
  }
}

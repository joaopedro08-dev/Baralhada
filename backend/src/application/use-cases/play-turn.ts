import { ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { RandomSource } from "../../domain/shared/random.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export class PlayTurn<State, Action, GameCode extends string> {
  constructor(
    private readonly session: RoomSession<State, Action, GameCode>,
    private readonly random: RandomSource
  ) {}

  perform(actor: Actor, action: Action): Result<null, ApplicationErrorCode<GameCode>> {
    return this.transition(actor, (game) =>
      this.session.rules.play(game, actor.playerId, action, this.random)
    )
  }

  finish(actor: Actor): Result<null, ApplicationErrorCode<GameCode>> {
    return this.transition(actor, (game) =>
      this.session.rules.pass(game, actor.playerId, this.random)
    )
  }

  private transition(
    actor: Actor,
    change: (game: State) => Result<State, GameCode>
  ): Result<null, ApplicationErrorCode<GameCode>> {
    const running = this.session.loadPlayableGame(actor)
    if (!running.ok) return running
    const next = change(running.value.game)
    if (!next.ok) return next
    this.session.commit({ ...running.value.room, game: next.value })
    return ok(null)
  }
}

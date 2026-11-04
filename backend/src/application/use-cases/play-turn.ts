import type { TurnAction } from "../../domain/game/turn-actions.js"
import { endTurn, playTurn } from "../../domain/game/turn-flow.js"
import type { Game } from "../../domain/game/model.js"
import type { GameErrorCode } from "../../domain/game/errors.js"
import type { RandomSource } from "../../domain/shared/random.js"
import { ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export class PlayTurn {
  constructor(
    private readonly session: RoomSession,
    private readonly random: RandomSource
  ) {}

  perform(actor: Actor, action: TurnAction): Result<null, ApplicationErrorCode> {
    return this.transition(actor, (game) => playTurn(game, actor.playerId, action, this.random))
  }

  finish(actor: Actor): Result<null, ApplicationErrorCode> {
    return this.transition(actor, (game) => endTurn(game, actor.playerId, this.random))
  }

  private transition(
    actor: Actor,
    change: (game: Game) => Result<Game, GameErrorCode>
  ): Result<null, ApplicationErrorCode> {
    const running = this.session.loadRunningGame(actor)
    if (!running.ok) return running
    const next = change(running.value.game)
    if (!next.ok) return next
    this.session.commit({ ...running.value.room, game: next.value })
    return ok(null)
  }
}

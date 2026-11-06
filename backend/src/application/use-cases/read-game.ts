import { err, ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { PlayerId } from "../../domain/shared/seat.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession, RunningGame } from "../room-session.js"

export interface GameSnapshot {
  readonly gameId: string
  readonly game: unknown
  readonly viewerId: PlayerId
}

const snapshotOf = (running: RunningGame, actor: Actor): GameSnapshot => ({
  gameId: running.room.gameId,
  game: running.game,
  viewerId: actor.playerId,
})

export class ReadGame {
  constructor(private readonly session: RoomSession) {}

  execute(actor: Actor): Result<GameSnapshot, ApplicationErrorCode> {
    const running = this.session.loadRunningGame(actor)
    return running.ok ? ok(snapshotOf(running.value, actor)) : running
  }

  forHints(actor: Actor): Result<GameSnapshot, ApplicationErrorCode> {
    const running = this.session.loadRunningGame(actor)
    if (!running.ok) return running
    if (!running.value.room.hintsAllowed) return err("HINTS_DISABLED")
    return ok(snapshotOf(running.value, actor))
  }
}

import { ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export class LeaveRoom {
  constructor(private readonly session: RoomSession) {}

  execute(actor: Actor): Result<null, ApplicationErrorCode> {
    const room = this.session.loadAsMember(actor)
    if (!room.ok) return room
    const remaining = this.session.remove(room.value, actor.playerId)
    if (remaining.players.length === 0) this.session.discard(remaining.code)
    return ok(null)
  }
}

import { ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export class LeaveRoom {
  constructor(private readonly session: RoomSession) {}

  execute(actor: Actor): Result<null, ApplicationErrorCode> {
    const room = this.session.loadAsMember(actor)
    if (!room.ok) return room
    this.session.remove(room.value, actor.playerId)
    return ok(null)
  }
}

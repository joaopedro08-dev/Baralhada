import { isHost } from "../../domain/room/room.js"
import { ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export class ChangePause {
  constructor(private readonly session: RoomSession) {}

  execute(actor: Actor, paused: boolean): Result<null, ApplicationErrorCode> {
    const loaded = this.session.loadRunningGame(actor)
    if (!loaded.ok) return loaded
    const { room } = loaded.value
    if (!isHost(room, actor.playerId)) return { ok: false, error: "NOT_HOST" }
    const changed = paused
      ? this.session.pause(room)
      : this.session.resume(room)
    if (!changed.ok) return changed
    this.session.commit(changed.value)
    return ok(null)
  }
}

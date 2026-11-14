import { ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export class ChangeTurnDuration {
  constructor(private readonly session: RoomSession) {}

  execute(actor: Actor, seconds: 15 | 30 | 60): Result<null, ApplicationErrorCode> {
    const loaded = this.session.loadAsIdleHost(actor)
    if (!loaded.ok) return loaded
    const changed = this.session.setTurnDuration(loaded.value, seconds)
    if (!changed.ok) return changed
    this.session.commit(changed.value)
    return ok(null)
  }
}

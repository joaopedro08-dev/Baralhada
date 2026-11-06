import { allowHints } from "../../domain/room/room.js"
import { ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export class ChangeHints {
  constructor(private readonly session: RoomSession) {}

  execute(actor: Actor, allowed: boolean): Result<null, ApplicationErrorCode> {
    const loaded = this.session.loadAsIdleHost(actor)
    if (!loaded.ok) return loaded
    const changed = allowHints(loaded.value, allowed)
    if (changed !== loaded.value) this.session.commit(changed)
    return ok(null)
  }
}

import { switchGame } from "../../domain/room/room.js"
import { ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export class RandomGame {
  constructor(private readonly session: RoomSession) {}

  execute(actor: Actor): Result<null, ApplicationErrorCode> {
    const loaded = this.session.loadAsIdleHost(actor)
    if (!loaded.ok) return loaded
    const selected = this.session.randomGame(loaded.value)
    if (!selected.ok) return selected
    if (loaded.value.gameId !== selected.value) {
      this.session.commit(switchGame(loaded.value, selected.value))
    }
    return ok(null)
  }
}

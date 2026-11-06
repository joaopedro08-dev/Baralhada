import { switchGame } from "../../domain/room/room.js"
import { err, ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export class ChooseGame {
  constructor(private readonly session: RoomSession) {}

  execute(actor: Actor, gameId: string): Result<null, ApplicationErrorCode> {
    const loaded = this.session.loadAsIdleHost(actor)
    if (!loaded.ok) return loaded
    if (!this.session.catalog.find(gameId)) return err("UNKNOWN_GAME")
    if (loaded.value.gameId !== gameId) this.session.commit(switchGame(loaded.value, gameId))
    return ok(null)
  }
}

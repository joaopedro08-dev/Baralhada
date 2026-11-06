import { findRoomPlayer } from "../../domain/room/room.js"
import { err, ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { PlayerId } from "../../domain/shared/seat.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { RoomNotifier } from "../ports.js"
import type { Actor, RoomSession } from "../room-session.js"

export class KickPlayer {
  constructor(
    private readonly session: RoomSession,
    private readonly notifier: RoomNotifier
  ) {}

  execute(actor: Actor, targetId: PlayerId): Result<null, ApplicationErrorCode> {
    const loaded = this.session.loadAsIdleHost(actor)
    if (!loaded.ok) return loaded
    const room = loaded.value

    if (targetId === actor.playerId) return err("CANNOT_KICK_SELF")
    if (!findRoomPlayer(room, targetId)) return err("PLAYER_NOT_IN_ROOM")

    this.notifier.notifyRemoved(targetId, "kicked")
    this.session.remove(room, targetId)
    return ok(null)
  }
}

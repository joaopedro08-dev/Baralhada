import { markDisconnected } from "../../domain/room/room.js"
import type { Clock } from "../ports.js"
import type { Actor, RoomSession } from "../room-session.js"

export class DisconnectPlayer {
  constructor(
    private readonly session: RoomSession,
    private readonly clock: Clock
  ) {}

  execute(actor: Actor): void {
    const room = this.session.loadAsMember(actor)
    if (!room.ok) return
    this.session.commit(markDisconnected(room.value, actor.playerId, this.clock.now()))
  }
}

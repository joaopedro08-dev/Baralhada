import type { Room } from "../../domain/room/room.js"
import type { Clock, GameSettings, RoomRepository } from "../ports.js"
import type { RoomSession } from "../room-session.js"

export class SweepRooms {
  constructor(
    private readonly rooms: RoomRepository,
    private readonly session: RoomSession,
    private readonly clock: Clock,
    private readonly settings: GameSettings
  ) {}

  execute(): void {
    const now = this.clock.now()
    for (const room of [...this.rooms.all()]) {
      const remaining = this.removeExpiredPlayers(room, now)
      if (
        remaining.emptySince !== null &&
        now - remaining.emptySince >= this.settings.emptyRoomTtlMs
      ) {
        this.session.discard(room.code)
      }
    }
  }

  private removeExpiredPlayers(room: Room, now: number): Room {
    return room.players
      .filter(
        (player) =>
          player.disconnectedAt !== null &&
          now - player.disconnectedAt >= this.settings.reconnectGraceMs
      )
      .reduce((current, player) => this.session.remove(current, player.id), room)
  }
}

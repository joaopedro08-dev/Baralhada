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
    this.session.removeExpiredPlayers(now)
    for (const room of [...this.rooms.all()]) {
      const current = this.rooms.find(room.code)
      if (
        current !== undefined &&
        current.emptySince !== null &&
        now - current.emptySince >= this.settings.emptyRoomTtlMs
      ) {
        this.session.discard(room.code)
      }
    }
  }
}

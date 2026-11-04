import type { RoomRepository } from "../application/ports.js"
import type { Room } from "../domain/room/room.js"

export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, Room>()

  find(code: string): Room | undefined {
    return this.rooms.get(code)
  }

  save(room: Room): void {
    this.rooms.set(room.code, room)
  }

  remove(code: string): void {
    this.rooms.delete(code)
  }

  all(): Iterable<Room> {
    return this.rooms.values()
  }

  count(): number {
    return this.rooms.size
  }
}

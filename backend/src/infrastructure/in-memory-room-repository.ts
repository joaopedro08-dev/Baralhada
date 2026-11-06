import type { RoomRepository } from "../application/ports.js"
import type { Room } from "../domain/room/room.js"

export class InMemoryRoomRepository<State = unknown> implements RoomRepository<State> {
  private readonly rooms = new Map<string, Room<State>>()

  find(code: string): Room<State> | undefined {
    return this.rooms.get(code)
  }

  save(room: Room<State>): void {
    this.rooms.set(room.code, room)
  }

  remove(code: string): void {
    this.rooms.delete(code)
  }

  all(): Iterable<Room<State>> {
    return this.rooms.values()
  }

  count(): number {
    return this.rooms.size
  }
}

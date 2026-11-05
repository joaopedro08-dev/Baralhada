export class AddressRoomQuota {
  private readonly roomsByAddress = new Map<string, Set<string>>()

  constructor(
    private readonly limit: number,
    private readonly roomExists: (code: string) => boolean
  ) {}

  hasRoomFor(address: string): boolean {
    this.forgetRemovedRooms()
    return (this.roomsByAddress.get(address)?.size ?? 0) < this.limit
  }

  record(address: string, code: string): void {
    const rooms = this.roomsByAddress.get(address) ?? new Set<string>()
    rooms.add(code)
    this.roomsByAddress.set(address, rooms)
  }

  private forgetRemovedRooms(): void {
    for (const [address, rooms] of this.roomsByAddress) {
      for (const code of rooms) {
        if (!this.roomExists(code)) rooms.delete(code)
      }
      if (rooms.size === 0) this.roomsByAddress.delete(address)
    }
  }
}

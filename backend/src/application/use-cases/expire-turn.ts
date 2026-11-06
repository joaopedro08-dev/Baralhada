import type { RandomSource } from "../../domain/shared/random.js"
import type { RoomSession } from "../room-session.js"

export class ExpireTurn {
  constructor(
    private readonly session: RoomSession,
    private readonly random: RandomSource
  ) {}

  execute(input: { roomCode: string; turnNumber: number }): void {
    const loaded = this.session.load(input.roomCode)
    if (!loaded.ok) return
    const room = loaded.value
    if (room.game === null || this.session.statusOf(room) !== "playing") return
    const rules = this.session.rulesOf(room)
    if (rules.turnOf(room.game).number !== input.turnNumber) return
    this.session.commit(this.session.advance(room, rules.expireTurn(room.game, this.random)))
  }
}

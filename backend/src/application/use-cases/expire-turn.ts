import { expireTurn } from "../../domain/game/turn-flow.js"
import { statusOf } from "../../domain/room/room.js"
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
    if (!room.game || statusOf(room) !== "playing") return
    if (room.game.turn.number !== input.turnNumber) return
    this.session.commit({ ...room, game: expireTurn(room.game, this.random) })
  }
}

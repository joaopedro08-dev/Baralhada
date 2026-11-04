import type { RandomSource } from "../../domain/shared/random.js"
import type { RoomSession } from "../room-session.js"

export class ExpireTurn<State, Action, GameCode extends string> {
  constructor(
    private readonly session: RoomSession<State, Action, GameCode>,
    private readonly random: RandomSource
  ) {}

  execute(input: { roomCode: string; turnNumber: number }): void {
    const loaded = this.session.load(input.roomCode)
    if (!loaded.ok) return
    const room = loaded.value
    const rules = this.session.rules
    if (room.game === null || this.session.statusOf(room) !== "playing") return
    if (rules.turnOf(room.game).number !== input.turnNumber) return
    this.session.commit({ ...room, game: rules.expireTurn(room.game, this.random) })
  }
}

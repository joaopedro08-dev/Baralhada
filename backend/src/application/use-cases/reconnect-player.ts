import { markReconnected } from "../../domain/room/room.js"
import { err, ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Clock } from "../ports.js"
import type { RoomSession } from "../room-session.js"
import type { SeatGrant } from "./create-room.js"

export class ReconnectPlayer<State, Action, GameCode extends string> {
  constructor(
    private readonly session: RoomSession<State, Action, GameCode>,
    private readonly clock: Clock
  ) {}

  execute(input: {
    code: string
    nickname: string
    reconnectToken: string
  }): Result<SeatGrant<State>, ApplicationErrorCode> {
    const room = this.session.load(input.code)
    if (!room.ok) return room

    const player = room.value.players.find(
      (seated) =>
        seated.nickname === input.nickname && seated.reconnectToken === input.reconnectToken
    )
    if (!player) return err("INVALID_RECONNECT")

    const saved = this.session.commit(markReconnected(room.value, player.id, this.clock.now()))
    return ok({
      room: saved,
      roomCode: input.code,
      playerId: player.id,
      reconnectToken: player.reconnectToken,
    })
  }
}

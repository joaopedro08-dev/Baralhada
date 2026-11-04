import { addPlayer } from "../../domain/room/room.js"
import { ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { IdentityGenerator } from "../ports.js"
import type { RoomSession } from "../room-session.js"
import type { SeatGrant } from "./create-room.js"

export class JoinRoom<State, Action, GameCode extends string> {
  constructor(
    private readonly identities: IdentityGenerator,
    private readonly session: RoomSession<State, Action, GameCode>
  ) {}

  execute(input: {
    code: string
    nickname: string
  }): Result<SeatGrant<State>, ApplicationErrorCode> {
    const room = this.session.load(input.code)
    if (!room.ok) return room

    const playerId = this.identities.playerId()
    const reconnectToken = this.identities.reconnectToken()
    const joined = addPlayer(
      room.value,
      {
        id: playerId,
        nickname: input.nickname,
        reconnectToken,
        connected: true,
        disconnectedAt: null,
      },
      this.session.rules
    )
    if (!joined.ok) return joined

    const saved = this.session.commit(joined.value)
    return ok({ room: saved, roomCode: input.code, playerId, reconnectToken })
  }
}

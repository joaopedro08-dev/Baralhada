import type { PlayerId } from "../../domain/game/model.js"
import { createRoom } from "../../domain/room/room.js"
import type { Room } from "../../domain/room/room.js"
import { err, ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { GameSettings, IdentityGenerator, RoomRepository } from "../ports.js"
import type { RoomSession } from "../room-session.js"

const MAX_CODE_ATTEMPTS = 8

export interface SeatGrant {
  readonly room: Room
  readonly roomCode: string
  readonly playerId: PlayerId
  readonly reconnectToken: string
}

export class CreateRoom {
  constructor(
    private readonly rooms: RoomRepository,
    private readonly identities: IdentityGenerator,
    private readonly session: RoomSession,
    private readonly settings: GameSettings
  ) {}

  execute(input: { nickname: string }): Result<SeatGrant, ApplicationErrorCode> {
    if (this.rooms.count() >= this.settings.maxRooms) return err("SERVER_FULL")
    const code = this.generateFreeCode()
    if (!code) return err("ROOM_CODE_UNAVAILABLE")

    const playerId = this.identities.playerId()
    const reconnectToken = this.identities.reconnectToken()
    const room = this.session.commit(
      createRoom(code, {
        id: playerId,
        nickname: input.nickname,
        reconnectToken,
        connected: true,
        disconnectedAt: null,
      })
    )
    return ok({ room, roomCode: code, playerId, reconnectToken })
  }

  private generateFreeCode(): string | null {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = this.identities.roomCode()
      if (!this.rooms.find(code)) return code
    }
    return null
  }
}

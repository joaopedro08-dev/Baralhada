import type { Game, PlayerId } from "../domain/game/model.js"
import { removePlayer } from "../domain/game/turn-flow.js"
import { dropPlayer, findRoomPlayer, statusOf } from "../domain/room/room.js"
import type { Room } from "../domain/room/room.js"
import type { RandomSource } from "../domain/shared/random.js"
import { err, ok } from "../domain/shared/result.js"
import type { Result } from "../domain/shared/result.js"
import type { ApplicationErrorCode } from "./errors.js"
import type { Clock, GameSettings, RoomNotifier, RoomRepository, TurnScheduler } from "./ports.js"

export interface Actor {
  readonly roomCode: string
  readonly playerId: PlayerId
}

export class RoomSession {
  constructor(
    private readonly rooms: RoomRepository,
    private readonly notifier: RoomNotifier,
    private readonly scheduler: TurnScheduler,
    private readonly clock: Clock,
    private readonly random: RandomSource,
    private readonly settings: GameSettings
  ) {}

  load(code: string): Result<Room, ApplicationErrorCode> {
    const room = this.rooms.find(code)
    return room ? ok(room) : err("ROOM_NOT_FOUND")
  }

  loadAsMember(actor: Actor): Result<Room, ApplicationErrorCode> {
    const room = this.load(actor.roomCode)
    if (!room.ok) return room
    return findRoomPlayer(room.value, actor.playerId) ? room : err("PLAYER_NOT_IN_ROOM")
  }

  loadRunningGame(actor: Actor): Result<{ room: Room; game: Game }, ApplicationErrorCode> {
    const room = this.loadAsMember(actor)
    if (!room.ok) return room
    return room.value.game && statusOf(room.value) === "playing"
      ? ok({ room: room.value, game: room.value.game })
      : err("GAME_NOT_RUNNING")
  }

  commit(room: Room): Room {
    const saved = { ...this.syncTurnTimer(room), version: room.version + 1 }
    this.rooms.save(saved)
    this.notifier.publish(saved)
    return saved
  }

  discard(code: string): void {
    this.scheduler.cancel(code)
    this.rooms.remove(code)
  }

  remove(room: Room, playerId: PlayerId): Room {
    const game = room.game && removePlayer(room.game, playerId, this.random)
    return this.commit(dropPlayer(room, playerId, game, this.clock.now()))
  }

  private syncTurnTimer(room: Room): Room {
    if (statusOf(room) !== "playing" || !room.game) {
      this.scheduler.cancel(room.code)
      return { ...room, timedTurnNumber: null, turnDeadlineAt: null }
    }
    const turnNumber = room.game.turn.number
    if (room.timedTurnNumber === turnNumber) return room
    this.scheduler.schedule(room.code, turnNumber, this.settings.turnDurationMs)
    return {
      ...room,
      timedTurnNumber: turnNumber,
      turnDeadlineAt: this.clock.now() + this.settings.turnDurationMs,
    }
  }
}

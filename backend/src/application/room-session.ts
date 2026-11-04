import type { GameRules } from "../domain/room/game-rules.js"
import { canStart, dropPlayer, findRoomPlayer, statusOf } from "../domain/room/room.js"
import type { Room, RoomStatus } from "../domain/room/room.js"
import type { RandomSource } from "../domain/shared/random.js"
import { err, ok } from "../domain/shared/result.js"
import type { Result } from "../domain/shared/result.js"
import type { PlayerId } from "../domain/shared/seat.js"
import type { ApplicationErrorCode } from "./errors.js"
import type { Clock, GameSettings, RoomNotifier, RoomRepository, TurnScheduler } from "./ports.js"

export interface Actor {
  readonly roomCode: string
  readonly playerId: PlayerId
}

export interface RunningGame<State> {
  readonly room: Room<State>
  readonly game: State
}

export interface SessionPorts<State> {
  readonly rooms: RoomRepository<State>
  readonly notifier: RoomNotifier<State>
  readonly scheduler: TurnScheduler
  readonly clock: Clock
  readonly random: RandomSource
}

export class RoomSession<State, Action, GameCode extends string> {
  private readonly rooms: RoomRepository<State>
  private readonly notifier: RoomNotifier<State>
  private readonly scheduler: TurnScheduler
  private readonly clock: Clock
  private readonly random: RandomSource

  constructor(
    readonly rules: GameRules<State, Action, GameCode>,
    ports: SessionPorts<State>,
    private readonly settings: GameSettings
  ) {
    this.rooms = ports.rooms
    this.notifier = ports.notifier
    this.scheduler = ports.scheduler
    this.clock = ports.clock
    this.random = ports.random
  }

  statusOf(room: Room<State>): RoomStatus {
    return statusOf(room, this.rules)
  }

  canStart(room: Room<State>): boolean {
    return canStart(room, this.rules)
  }

  load(code: string): Result<Room<State>, ApplicationErrorCode> {
    const room = this.rooms.find(code)
    return room ? ok(room) : err("ROOM_NOT_FOUND")
  }

  loadAsMember(actor: Actor): Result<Room<State>, ApplicationErrorCode> {
    const room = this.load(actor.roomCode)
    if (!room.ok) return room
    return findRoomPlayer(room.value, actor.playerId) ? room : err("PLAYER_NOT_IN_ROOM")
  }

  loadRunningGame(actor: Actor): Result<RunningGame<State>, ApplicationErrorCode> {
    const room = this.loadAsMember(actor)
    if (!room.ok) return room
    const game = room.value.game
    return game !== null && this.statusOf(room.value) === "playing"
      ? ok({ room: room.value, game })
      : err("GAME_NOT_RUNNING")
  }

  loadPlayableGame(actor: Actor): Result<RunningGame<State>, ApplicationErrorCode> {
    const running = this.loadRunningGame(actor)
    if (!running.ok) return running
    return (running.value.room.matchStartsAt ?? 0) > this.clock.now()
      ? err("MATCH_STARTING")
      : running
  }

  countdownEnd(): number {
    return this.clock.now() + this.settings.matchCountdownMs
  }

  commit(room: Room<State>): Room<State> {
    const saved = { ...this.syncTurnTimer(room), version: room.version + 1 }
    this.rooms.save(saved)
    this.notifier.publish(saved)
    return saved
  }

  discard(code: string): void {
    this.scheduler.cancel(code)
    this.rooms.remove(code)
  }

  remove(room: Room<State>, playerId: PlayerId): Room<State> {
    const game =
      room.game === null ? null : this.rules.removePlayer(room.game, playerId, this.random)
    return this.commit(dropPlayer(room, playerId, game, this.clock.now()))
  }

  private syncTurnTimer(room: Room<State>): Room<State> {
    if (room.game === null || this.statusOf(room) !== "playing") {
      this.scheduler.cancel(room.code)
      return { ...room, timedTurnNumber: null, turnDeadlineAt: null }
    }
    const turnNumber = this.rules.turnOf(room.game).number
    if (room.timedTurnNumber === turnNumber) return room
    const now = this.clock.now()
    const countdownLeft = Math.max(0, (room.matchStartsAt ?? 0) - now)
    const delay = countdownLeft + this.settings.turnDurationMs
    this.scheduler.schedule(room.code, turnNumber, delay)
    return {
      ...room,
      timedTurnNumber: turnNumber,
      turnDeadlineAt: now + delay,
    }
  }
}

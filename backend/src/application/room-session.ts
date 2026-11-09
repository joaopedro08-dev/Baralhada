import type { GameCatalog } from "../domain/room/game-catalog.js"
import type { AnyGameRules } from "../domain/room/game-rules.js"
import {
  dropPlayer,
  findRoomPlayer,
  isHost,
  startProblemOf,
  statusOf,
} from "../domain/room/room.js"
import type { Room, RoomStatus, StartProblem } from "../domain/room/room.js"
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

export interface RunningGame {
  readonly room: Room
  readonly game: unknown
  readonly rules: AnyGameRules
}

export interface SessionPorts {
  readonly rooms: RoomRepository
  readonly notifier: RoomNotifier
  readonly scheduler: TurnScheduler
  readonly clock: Clock
  readonly random: RandomSource
}

export class RoomSession {
  private readonly rooms: RoomRepository
  private readonly notifier: RoomNotifier
  private readonly scheduler: TurnScheduler
  private readonly clock: Clock
  private readonly random: RandomSource

  constructor(
    readonly catalog: GameCatalog,
    ports: SessionPorts,
    private readonly settings: GameSettings
  ) {
    this.rooms = ports.rooms
    this.notifier = ports.notifier
    this.scheduler = ports.scheduler
    this.clock = ports.clock
    this.random = ports.random
  }

  rulesOf(room: Room): AnyGameRules {
    const rules = this.catalog.find(room.gameId)
    if (!rules) throw new Error(`Jogo desconhecido: ${room.gameId}`)
    return rules
  }

  statusOf(room: Room): RoomStatus {
    return statusOf(room, this.rulesOf(room))
  }

  startProblemOf(room: Room): StartProblem | null {
    return startProblemOf(room, this.rulesOf(room))
  }

  load(code: string): Result<Room, ApplicationErrorCode> {
    const room = this.rooms.find(code)
    return room ? ok(room) : err("ROOM_NOT_FOUND")
  }

  loadAsMember(actor: Actor): Result<Room, ApplicationErrorCode> {
    const room = this.load(actor.roomCode)
    if (!room.ok) return room
    return findRoomPlayer(room.value, actor.playerId) ? room : err("PLAYER_NOT_IN_ROOM")
  }

  loadAsIdleHost(actor: Actor): Result<Room, ApplicationErrorCode> {
    const room = this.loadAsMember(actor)
    if (!room.ok) return room
    if (!isHost(room.value, actor.playerId)) return err("NOT_HOST")
    return this.statusOf(room.value) === "playing" ? err("GAME_ALREADY_STARTED") : room
  }

  loadRunningGame(actor: Actor): Result<RunningGame, ApplicationErrorCode> {
    const room = this.loadAsMember(actor)
    if (!room.ok) return room
    const game = room.value.game
    return game !== null && this.statusOf(room.value) === "playing"
      ? ok({ room: room.value, game, rules: this.rulesOf(room.value) })
      : err("GAME_NOT_RUNNING")
  }

  loadPlayableGame(actor: Actor, duringPause = false): Result<RunningGame, ApplicationErrorCode> {
    const running = this.loadRunningGame(actor)
    if (!running.ok) return running
    const { room } = running.value
    const now = this.clock.now()
    if ((room.matchStartsAt ?? 0) > now) return err("MATCH_STARTING")
    return !duringPause &&
      ((room.pausedUntil ?? 0) > now || room.pausedAt !== null)
      ? err("TABLE_PAUSED")
      : running
  }

  pause(room: Room): Result<Room, ApplicationErrorCode> {
    if (room.pausedAt !== null) return err("TABLE_ALREADY_PAUSED")
    return ok({ ...room, pausedAt: this.clock.now() })
  }

  resume(room: Room): Result<Room, ApplicationErrorCode> {
    if (room.pausedAt === null) return err("TABLE_NOT_PAUSED")
    const elapsed = this.clock.now() - room.pausedAt
    const shift = (value: number | null): number | null =>
      value === null ? null : value + elapsed
    return ok({
      ...room,
      matchStartsAt: shift(room.matchStartsAt),
      turnDeadlineAt: shift(room.turnDeadlineAt),
      pausedAt: null,
      timedTurnNumber: null,
    })
  }

  advance(room: Room, game: unknown): Room {
    const rules = this.rulesOf(room)
    const ruled = room.game === null ? 0 : (rules.pauseAfter?.(room.game, game) ?? 0)
    const pause = ruled > 0 ? (this.settings.pauseOverrideMs ?? ruled) : 0
    return pause > 0 ? { ...room, game, pausedUntil: this.clock.now() + pause } : { ...room, game }
  }

  countdownEnd(): number {
    return this.clock.now() + this.settings.matchCountdownMs
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
    const game =
      room.game === null ? null : this.rulesOf(room).removePlayer(room.game, playerId, this.random)
    return this.commit(dropPlayer(room, playerId, game, this.clock.now()))
  }

  private turnDurationOf(rules: AnyGameRules): number {
    return this.settings.turnDurationOverrideMs ?? rules.turnDurationMs
  }

  private turnDelayOf(room: Room, automatic: boolean, rules: AnyGameRules, now: number): number {
    if (automatic) return 0
    if (room.timedTurnNumber === null && room.turnDeadlineAt !== null) {
      return Math.max(0, room.turnDeadlineAt - now)
    }
    return this.turnDurationOf(rules)
  }

  private syncTurnTimer(room: Room): Room {
    if (room.game === null || this.statusOf(room) !== "playing") {
      this.scheduler.cancel(room.code)
      return { ...room, timedTurnNumber: null, turnDeadlineAt: null }
    }
    const rules = this.rulesOf(room)
    if (room.pausedAt !== null) {
      this.scheduler.cancel(room.code)
      return { ...room, timedTurnNumber: null, turnDeadlineAt: room.turnDeadlineAt }
    }
    const turn = rules.turnOf(room.game)
    if (room.timedTurnNumber === turn.number) return room
    const now = this.clock.now()
    const waitLeft = Math.max(0, (room.matchStartsAt ?? 0) - now, (room.pausedUntil ?? 0) - now)
    const resuming = room.timedTurnNumber === null && room.turnDeadlineAt !== null
    const turnDelay = this.turnDelayOf(room, turn.automatic ?? false, rules, now)
    const delay = resuming ? Math.max(waitLeft, turnDelay) : waitLeft + turnDelay
    this.scheduler.schedule(room.code, turn.number, delay)
    return {
      ...room,
      timedTurnNumber: turn.number,
      turnDeadlineAt: turn.automatic ? null : now + delay,
    }
  }
}

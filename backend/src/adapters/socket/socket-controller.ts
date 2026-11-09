import type { z } from "zod"
import type { Clock, Logger } from "../../application/ports.js"
import type { Actor } from "../../application/room-session.js"
import type { ArrangeTeams } from "../../application/use-cases/arrange-teams.js"
import type { ChooseGame } from "../../application/use-cases/choose-game.js"
import type { ChangeHints } from "../../application/use-cases/change-hints.js"
import type { ChangePause } from "../../application/use-cases/change-pause.js"
import type { CreateRoom, SeatGrant } from "../../application/use-cases/create-room.js"
import type { DisconnectPlayer } from "../../application/use-cases/disconnect-player.js"
import type { JoinRoom } from "../../application/use-cases/join-room.js"
import type { KickPlayer } from "../../application/use-cases/kick-player.js"
import type { LeaveRoom } from "../../application/use-cases/leave-room.js"
import type { PlayTurn } from "../../application/use-cases/play-turn.js"
import type { ReadGame } from "../../application/use-cases/read-game.js"
import type { ReconnectPlayer } from "../../application/use-cases/reconnect-player.js"
import type { StartMatch } from "../../application/use-cases/start-match.js"
import { err, ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import { AddressRoomQuota } from "./address-room-quota.js"
import type { ClientConnection, CommandMetrics, RawAck } from "./connection.js"
import type { Ack, ClientCommand, ClientCommands, HintsDto, SeatDto } from "./contract.js"
import type { ErrorCode, ErrorMessages } from "./messages.js"
import type { RoomPresenter } from "./presenter.js"
import { AddressRateLimiter, TokenBucket } from "./rate-limiter.js"
import {
  anyPayloadSchema,
  chooseGameSchema,
  createRoomSchema,
  emptySchema,
  hintsSettingSchema,
  pauseSettingSchema,
  joinRoomSchema,
  kickSchema,
  moveTeamSchema,
  reconnectSchema,
} from "./schemas.js"
import type { ClientSession, SessionRegistry } from "./session-registry.js"

const RATE_LIMIT_BURST = 40
const RATE_LIMIT_PER_SECOND = 20

export interface SocketUseCases {
  readonly createRoom: CreateRoom
  readonly joinRoom: JoinRoom
  readonly reconnectPlayer: ReconnectPlayer
  readonly leaveRoom: LeaveRoom
  readonly kickPlayer: KickPlayer
  readonly chooseGame: ChooseGame
  readonly arrangeTeams: ArrangeTeams
  readonly changeHints: ChangeHints
  readonly changePause: ChangePause
  readonly disconnectPlayer: DisconnectPlayer
  readonly startMatch: StartMatch
  readonly playTurn: PlayTurn
  readonly readGame: ReadGame
}

export interface SocketControllerOptions {
  readonly presentation: SocketPresentation
  readonly publicUrl: string
  readonly roomCreationsPerMinute: number
  readonly roomJoinsPerMinute: number
  readonly maxRoomsPerAddress: number
  readonly roomExists: (code: string) => boolean
}

export interface SocketPresentation {
  readonly presenter: RoomPresenter
  readonly messages: ErrorMessages
}

type Outcome = Result<unknown, ErrorCode>

type SeatedRegistrar = (
  command: ClientCommand,
  schema: z.ZodType,
  run: (input: never) => Result<SeatGrant, ErrorCode>
) => void

type MemberRegistrar = (
  command: ClientCommand,
  schema: z.ZodType,
  run: (actor: Actor, input: never) => Outcome
) => void

type Dispatched<T> =
  | Result<T, ErrorCode>
  | { readonly ok: false; readonly error: "INTERNAL_ERROR"; readonly failure: unknown }

export class SocketController {
  private readonly roomCreations: AddressRateLimiter
  private readonly roomJoins: AddressRateLimiter
  private readonly roomQuota: AddressRoomQuota

  constructor(
    private readonly useCases: SocketUseCases,
    private readonly registry: SessionRegistry,
    private readonly metrics: CommandMetrics,
    private readonly logger: Logger,
    private readonly clock: Clock,
    private readonly options: SocketControllerOptions
  ) {
    const limiterOf = (perMinute: number) =>
      new AddressRateLimiter(perMinute, perMinute / 60, clock)
    this.roomCreations = limiterOf(options.roomCreationsPerMinute)
    this.roomJoins = limiterOf(options.roomJoinsPerMinute)
    this.roomQuota = new AddressRoomQuota(options.maxRoomsPerAddress, options.roomExists)
  }

  attach(connection: ClientConnection): void {
    const session: ClientSession = { connection, actor: null }
    const bucket = new TokenBucket(RATE_LIMIT_BURST, RATE_LIMIT_PER_SECOND, this.clock)
    this.metrics.connectionOpened()

    const seated: SeatedRegistrar = (command, schema, run) =>
      this.register(connection, bucket, command, schema, (input) => {
        if (session.actor) return err("ALREADY_IN_ROOM")
        const grant = run(input as never)
        return grant.ok ? ok(this.grantSeat(session, grant.value)) : grant
      })

    const member: MemberRegistrar = (command, schema, run) =>
      this.register(connection, bucket, command, schema, (input) =>
        session.actor ? run(session.actor, input as never) : err("NOT_IN_ROOM")
      )

    this.registerEntry(connection, seated)
    this.registerRoomCommands(session, member)
    this.registerGameCommands(member)
    connection.onDisconnect(() => this.handleDisconnect(session))
  }

  private registerEntry(connection: ClientConnection, seated: SeatedRegistrar): void {
    const { createRoom, joinRoom, reconnectPlayer } = this.useCases
    seated("room:create", createRoomSchema, (input: ClientCommands["room:create"]["input"]) => {
      const address = connection.clientAddress
      if (!this.roomQuota.hasRoomFor(address)) return err("TOO_MANY_ROOMS")
      if (!this.roomCreations.tryConsume(address)) return err("RATE_LIMITED")
      const created = createRoom.execute(input)
      if (created.ok) this.roomQuota.record(address, created.value.roomCode)
      return created
    })
    seated("room:join", joinRoomSchema, (input: ClientCommands["room:join"]["input"]) =>
      this.roomJoins.tryConsume(connection.clientAddress)
        ? joinRoom.execute(input)
        : err("RATE_LIMITED")
    )
    seated("room:reconnect", reconnectSchema, (input: ClientCommands["room:reconnect"]["input"]) =>
      reconnectPlayer.execute(input)
    )
  }

  private registerRoomCommands(session: ClientSession, member: MemberRegistrar): void {
    const { leaveRoom, kickPlayer, chooseGame, arrangeTeams, changeHints, changePause } =
      this.useCases
    member("room:leave", emptySchema, (actor) => {
      const left = leaveRoom.execute(actor)
      if (left.ok) this.registry.unbind(session)
      return left
    })
    member("room:kick", kickSchema, (actor, input: ClientCommands["room:kick"]["input"]) =>
      kickPlayer.execute(actor, input.playerId)
    )
    member("room:game", chooseGameSchema, (actor, input: ClientCommands["room:game"]["input"]) =>
      chooseGame.execute(actor, input.gameId)
    )
    member("room:team", moveTeamSchema, (actor, input: ClientCommands["room:team"]["input"]) =>
      arrangeTeams.move(actor, input.playerId, input.team)
    )
    member("room:teams-draw", emptySchema, (actor) => arrangeTeams.draw(actor))
    member(
      "room:hints",
      hintsSettingSchema,
      (actor, input: ClientCommands["room:hints"]["input"]) =>
        changeHints.execute(actor, input.allowed)
    )
    member(
      "room:pause",
      pauseSettingSchema,
      (actor, input: ClientCommands["room:pause"]["input"]) =>
        changePause.execute(actor, input.paused)
    )
  }

  private registerGameCommands(member: MemberRegistrar): void {
    const { startMatch, playTurn, readGame } = this.useCases
    const { presenter } = this.options.presentation
    member("game:start", emptySchema, (actor) => startMatch.execute(actor))
    member("game:action", anyPayloadSchema, (actor, payload: unknown) =>
      playTurn.perform(actor, (gameId) => {
        const parsed = presenter.resolve(gameId).adapter.actionSchema.safeParse(payload)
        return parsed.success ? ok(parsed.data) : err("INVALID_PAYLOAD")
      })
    )
    member("game:hints", emptySchema, (actor) => {
      const snapshot = readGame.forHints(actor)
      if (!snapshot.ok) return snapshot
      const { gameId, game, viewerId } = snapshot.value
      return ok(presenter.resolve(gameId).adapter.hints(game, viewerId) as HintsDto)
    })
  }

  private handleDisconnect(session: ClientSession): void {
    this.metrics.connectionClosed()
    const { actor } = session
    if (!actor) return
    this.registry.unbind(session)
    try {
      this.useCases.disconnectPlayer.execute(actor)
    } catch (failure) {
      this.logger.error({ err: failure, room: actor.roomCode }, "disconnect failed")
    }
  }

  private grantSeat(session: ClientSession, grant: SeatGrant): SeatDto {
    this.registry.bind(session, { roomCode: grant.roomCode, playerId: grant.playerId })
    const present = this.options.presentation.presenter.present(grant.room, this.clock.now())
    session.connection.emit("room:state", present(grant.playerId))
    return {
      code: grant.roomCode,
      playerId: grant.playerId,
      reconnectToken: grant.reconnectToken,
      inviteUrl: `${this.options.publicUrl}/?sala=${grant.roomCode}`,
    }
  }

  private register(
    connection: ClientConnection,
    bucket: TokenBucket,
    command: ClientCommand,
    schema: z.ZodType,
    run: (input: unknown) => Outcome
  ): void {
    connection.on(command, (payload, ack) => {
      const startedAt = performance.now()
      const result = this.dispatch(bucket, schema, payload, run)
      const outcome = this.respond(command, result, ack)
      this.metrics.observeCommand(command, outcome, (performance.now() - startedAt) / 1000)
    })
  }

  private dispatch<T>(
    bucket: TokenBucket,
    schema: z.ZodType,
    payload: unknown,
    run: (input: unknown) => Result<T, ErrorCode>
  ): Dispatched<T> {
    if (!bucket.tryConsume()) return err("RATE_LIMITED")
    const parsed = schema.safeParse(payload)
    if (!parsed.success) return err("INVALID_PAYLOAD")
    try {
      return run(parsed.data)
    } catch (failure) {
      return { ok: false, error: "INTERNAL_ERROR", failure }
    }
  }

  private respond<T>(
    command: string,
    result: Dispatched<T>,
    ack: RawAck
  ): "ok" | "rejected" | "failed" {
    const response: Ack<T> = result.ok
      ? { ok: true, data: result.value }
      : {
          ok: false,
          error: { code: result.error, message: this.options.presentation.messages(result.error) },
        }
    ack(response)
    if (result.ok) return "ok"
    if (!("failure" in result)) return "rejected"
    this.logger.error({ command, err: result.failure }, "command failed")
    return "failed"
  }
}

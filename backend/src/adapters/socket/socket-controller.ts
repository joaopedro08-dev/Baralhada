import type { z } from "zod"
import type { Clock, Logger } from "../../application/ports.js"
import type { Actor } from "../../application/room-session.js"
import type { SeatGrant } from "../../application/use-cases/create-room.js"
import type { CreateRoom } from "../../application/use-cases/create-room.js"
import type { DisconnectPlayer } from "../../application/use-cases/disconnect-player.js"
import type { JoinRoom } from "../../application/use-cases/join-room.js"
import type { KickPlayer } from "../../application/use-cases/kick-player.js"
import type { LeaveRoom } from "../../application/use-cases/leave-room.js"
import type { PlayTurn } from "../../application/use-cases/play-turn.js"
import type { ReconnectPlayer } from "../../application/use-cases/reconnect-player.js"
import type { GetHints } from "../../application/use-cases/rouba-monte/get-hints.js"
import type { StartMatch } from "../../application/use-cases/start-match.js"
import { err, ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import { AddressRoomQuota } from "./address-room-quota.js"
import type { ClientConnection, CommandMetrics, RawAck } from "./connection.js"
import type { Ack, ClientCommand, ClientCommands, SeatDto } from "./contract.js"
import type { Game, GameErrorCode, TurnAction } from "./game.js"
import { errorMessage } from "./messages.js"
import type { ErrorCode } from "./messages.js"
import { createRoomStatePresenter, presentHints } from "./presenter.js"
import { AddressRateLimiter, TokenBucket } from "./rate-limiter.js"
import {
  createRoomSchema,
  emptySchema,
  joinRoomSchema,
  kickSchema,
  reconnectSchema,
  turnActionSchema,
} from "./schemas.js"
import type { ClientSession, SessionRegistry } from "./session-registry.js"

const RATE_LIMIT_BURST = 40
const RATE_LIMIT_PER_SECOND = 20

export interface SocketUseCases {
  readonly createRoom: CreateRoom<Game, TurnAction, GameErrorCode>
  readonly joinRoom: JoinRoom<Game, TurnAction, GameErrorCode>
  readonly reconnectPlayer: ReconnectPlayer<Game, TurnAction, GameErrorCode>
  readonly leaveRoom: LeaveRoom<Game, TurnAction, GameErrorCode>
  readonly kickPlayer: KickPlayer<Game, TurnAction, GameErrorCode>
  readonly disconnectPlayer: DisconnectPlayer<Game, TurnAction, GameErrorCode>
  readonly startMatch: StartMatch<Game, TurnAction, GameErrorCode>
  readonly playTurn: PlayTurn<Game, TurnAction, GameErrorCode>
  readonly getHints: GetHints
}

export interface SocketControllerOptions {
  readonly publicUrl: string
  readonly roomCreationsPerMinute: number
  readonly roomJoinsPerMinute: number
  readonly maxRoomsPerAddress: number
  readonly roomExists: (code: string) => boolean
}

type Outcome<C extends ClientCommand> = Result<ClientCommands[C]["output"], ErrorCode>

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

    const { createRoom, joinRoom, reconnectPlayer, leaveRoom, kickPlayer } = this.useCases
    const { startMatch, playTurn, getHints } = this.useCases

    const seated = <C extends ClientCommand>(
      command: C,
      schema: z.ZodType,
      run: (input: never) => Result<SeatGrant<Game>, ErrorCode>
    ) =>
      this.register(connection, bucket, command, schema, (input) => {
        if (session.actor) return err("ALREADY_IN_ROOM")
        const grant = run(input as never)
        return grant.ok ? ok(this.grantSeat(session, grant.value)) : grant
      })

    const member = <C extends ClientCommand>(
      command: C,
      schema: z.ZodType,
      run: (actor: Actor, input: never) => Outcome<C>
    ) =>
      this.register(connection, bucket, command, schema, (input) =>
        session.actor ? run(session.actor, input as never) : err("NOT_IN_ROOM")
      )

    seated("room:create", createRoomSchema, (input: { nickname: string }) => {
      const address = connection.clientAddress
      if (!this.roomQuota.hasRoomFor(address)) return err("TOO_MANY_ROOMS")
      if (!this.roomCreations.tryConsume(address)) return err("RATE_LIMITED")
      const created = createRoom.execute(input)
      if (created.ok) this.roomQuota.record(address, created.value.roomCode)
      return created
    })
    seated("room:join", joinRoomSchema, (input: { code: string; nickname: string }) =>
      this.roomJoins.tryConsume(connection.clientAddress)
        ? joinRoom.execute(input)
        : err("RATE_LIMITED")
    )
    seated(
      "room:reconnect",
      reconnectSchema,
      (input: { code: string; nickname: string; reconnectToken: string }) =>
        reconnectPlayer.execute(input)
    )
    member("room:leave", emptySchema, (actor) => {
      const left = leaveRoom.execute(actor)
      if (left.ok) this.registry.unbind(session)
      return left
    })
    member("room:kick", kickSchema, (actor, input: { playerId: string }) =>
      kickPlayer.execute(actor, input.playerId)
    )
    member("game:start", emptySchema, (actor) => startMatch.execute(actor))
    member("game:action", turnActionSchema, (actor, action: TurnAction) =>
      playTurn.perform(actor, action)
    )
    member("game:endTurn", emptySchema, (actor) => playTurn.finish(actor))
    member("game:hints", emptySchema, (actor) => {
      const hints = getHints.execute(actor)
      return hints.ok ? ok(presentHints(hints.value)) : hints
    })

    connection.onDisconnect(() => this.handleDisconnect(session))
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

  private grantSeat(session: ClientSession, grant: SeatGrant<Game>): SeatDto {
    this.registry.bind(session, { roomCode: grant.roomCode, playerId: grant.playerId })
    const present = createRoomStatePresenter(grant.room, this.clock.now())
    session.connection.emit("room:state", present(grant.playerId))
    return {
      code: grant.roomCode,
      playerId: grant.playerId,
      reconnectToken: grant.reconnectToken,
      inviteUrl: `${this.options.publicUrl}/?sala=${grant.roomCode}`,
    }
  }

  private register<C extends ClientCommand>(
    connection: ClientConnection,
    bucket: TokenBucket,
    command: C,
    schema: z.ZodType,
    run: (input: unknown) => Outcome<C>
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
  ):
    | Result<T, ErrorCode>
    | { readonly ok: false; readonly error: "INTERNAL_ERROR"; readonly failure: unknown } {
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
    result: Result<T, ErrorCode> | { ok: false; error: "INTERNAL_ERROR"; failure: unknown },
    ack: RawAck
  ): "ok" | "rejected" | "failed" {
    const response: Ack<T> = result.ok
      ? { ok: true, data: result.value }
      : { ok: false, error: { code: result.error, message: errorMessage(result.error) } }
    ack(response)
    if (result.ok) return "ok"
    if (!("failure" in result)) return "rejected"
    this.logger.error({ command, err: result.failure }, "command failed")
    return "failed"
  }
}

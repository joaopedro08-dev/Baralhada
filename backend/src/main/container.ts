import { SessionRegistry } from "../adapters/socket/session-registry.js"
import { SocketController } from "../adapters/socket/socket-controller.js"
import { SocketNotifier } from "../adapters/socket/socket-notifier.js"
import type { Clock, Logger } from "../application/ports.js"
import { RoomSession } from "../application/room-session.js"
import { CreateRoom } from "../application/use-cases/create-room.js"
import { DisconnectPlayer } from "../application/use-cases/disconnect-player.js"
import { ExpireTurn } from "../application/use-cases/expire-turn.js"
import { GetHints } from "../application/use-cases/rouba-monte/get-hints.js"
import { JoinRoom } from "../application/use-cases/join-room.js"
import { KickPlayer } from "../application/use-cases/kick-player.js"
import { LeaveRoom } from "../application/use-cases/leave-room.js"
import { PlayTurn } from "../application/use-cases/play-turn.js"
import { ReconnectPlayer } from "../application/use-cases/reconnect-player.js"
import { StartMatch } from "../application/use-cases/start-match.js"
import { SweepRooms } from "../application/use-cases/sweep-rooms.js"
import { cryptoIdentityGenerator, cryptoRandomSource } from "../infrastructure/crypto-identity.js"
import { InMemoryRoomRepository } from "../infrastructure/in-memory-room-repository.js"
import { NodeTurnScheduler } from "../infrastructure/node-turn-scheduler.js"
import { PrometheusMetrics } from "../infrastructure/prometheus-metrics.js"
import { roubaMonteRules } from "../domain/games/rouba-monte/rules.js"
import type { GameErrorCode } from "../domain/games/rouba-monte/errors.js"
import type { Game } from "../domain/games/rouba-monte/model.js"
import type { TurnAction } from "../domain/games/rouba-monte/turn-actions.js"
import type { AppConfig } from "./config.js"

const systemClock: Clock = { now: () => Date.now() }

export interface Container {
  readonly controller: SocketController
  readonly metrics: PrometheusMetrics<Game>
  readonly scheduler: NodeTurnScheduler
  readonly sweepRooms: SweepRooms<Game, TurnAction, GameErrorCode>
}

export const buildContainer = (config: AppConfig, logger: Logger): Container => {
  const rules = roubaMonteRules
  const rooms = new InMemoryRoomRepository<Game>()
  const metrics = new PrometheusMetrics(rooms, rules)
  const registry = new SessionRegistry()
  const notifier = new SocketNotifier(registry, metrics, systemClock)
  const random = cryptoRandomSource
  const scheduler = new NodeTurnScheduler((input) => {
    try {
      expireTurn.execute(input)
    } catch (failure) {
      logger.error({ err: failure, room: input.roomCode }, "turn expiration failed")
    }
  })
  const session = new RoomSession(
    rules,
    { rooms, notifier, scheduler, clock: systemClock, random },
    config.game
  )
  const expireTurn = new ExpireTurn(session, random)
  const identities = cryptoIdentityGenerator

  const controller = new SocketController(
    {
      createRoom: new CreateRoom(rooms, identities, session, config.game),
      joinRoom: new JoinRoom(identities, session),
      reconnectPlayer: new ReconnectPlayer(session, systemClock),
      leaveRoom: new LeaveRoom(session),
      kickPlayer: new KickPlayer(session, notifier),
      disconnectPlayer: new DisconnectPlayer(session, systemClock),
      startMatch: new StartMatch(session, random),
      playTurn: new PlayTurn(session, random),
      getHints: new GetHints(session),
    },
    registry,
    metrics,
    logger,
    systemClock,
    {
      publicUrl: config.publicUrl,
      roomCreationsPerMinute: config.roomCreationsPerMinute,
      roomJoinsPerMinute: config.roomJoinsPerMinute,
      maxRoomsPerAddress: config.maxRoomsPerAddress,
      roomExists: (code) => rooms.find(code) !== undefined,
    }
  )

  return {
    controller,
    metrics,
    scheduler,
    sweepRooms: new SweepRooms(rooms, session, systemClock, config.game),
  }
}

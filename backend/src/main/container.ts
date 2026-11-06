import { createGameAdapters } from "../adapters/socket/game-adapter.js"
import { roubaMonteAdapter } from "../adapters/socket/games/rouba-monte/adapter.js"
import { trucoAdapter } from "../adapters/socket/games/truco/adapter.js"
import { createErrorMessages } from "../adapters/socket/messages.js"
import { RoomPresenter } from "../adapters/socket/presenter.js"
import { SessionRegistry } from "../adapters/socket/session-registry.js"
import { SocketController } from "../adapters/socket/socket-controller.js"
import { SocketNotifier } from "../adapters/socket/socket-notifier.js"
import type { Clock, Logger } from "../application/ports.js"
import { RoomSession } from "../application/room-session.js"
import { ArrangeTeams } from "../application/use-cases/arrange-teams.js"
import { ChangeHints } from "../application/use-cases/change-hints.js"
import { ChooseGame } from "../application/use-cases/choose-game.js"
import { CreateRoom } from "../application/use-cases/create-room.js"
import { DisconnectPlayer } from "../application/use-cases/disconnect-player.js"
import { ExpireTurn } from "../application/use-cases/expire-turn.js"
import { JoinRoom } from "../application/use-cases/join-room.js"
import { KickPlayer } from "../application/use-cases/kick-player.js"
import { LeaveRoom } from "../application/use-cases/leave-room.js"
import { PlayTurn } from "../application/use-cases/play-turn.js"
import { ReadGame } from "../application/use-cases/read-game.js"
import { ReconnectPlayer } from "../application/use-cases/reconnect-player.js"
import { StartMatch } from "../application/use-cases/start-match.js"
import { SweepRooms } from "../application/use-cases/sweep-rooms.js"
import { roubaMonteRules } from "../domain/games/rouba-monte/rules.js"
import { trucoRules } from "../domain/games/truco/rules.js"
import { createGameCatalog } from "../domain/room/game-catalog.js"
import type { Room, RoomStatus } from "../domain/room/room.js"
import { cryptoIdentityGenerator, cryptoRandomSource } from "../infrastructure/crypto-identity.js"
import { InMemoryRoomRepository } from "../infrastructure/in-memory-room-repository.js"
import { NodeTurnScheduler } from "../infrastructure/node-turn-scheduler.js"
import { PrometheusMetrics } from "../infrastructure/prometheus-metrics.js"
import type { AppConfig } from "./config.js"

const systemClock: Clock = { now: () => Date.now() }

export const gameCatalog = createGameCatalog([roubaMonteRules, trucoRules])

export const gameAdapters = createGameAdapters([roubaMonteAdapter, trucoAdapter])

export interface Container {
  readonly controller: SocketController
  readonly metrics: PrometheusMetrics
  readonly scheduler: NodeTurnScheduler
  readonly sweepRooms: SweepRooms
}

export const buildContainer = (config: AppConfig, logger: Logger): Container => {
  const rooms = new InMemoryRoomRepository()
  const presenter = new RoomPresenter(gameCatalog, gameAdapters, config.game.turnDurationOverrideMs)
  const registry = new SessionRegistry()
  const random = cryptoRandomSource
  const scheduler = new NodeTurnScheduler((input) => {
    try {
      expireTurn.execute(input)
    } catch (failure) {
      logger.error({ err: failure, room: input.roomCode }, "turn expiration failed")
    }
  })
  const metrics = new PrometheusMetrics(rooms, (room: Room): RoomStatus => session.statusOf(room))
  const notifier = new SocketNotifier(registry, metrics, systemClock, presenter)
  const session = new RoomSession(
    gameCatalog,
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
      chooseGame: new ChooseGame(session),
      arrangeTeams: new ArrangeTeams(session, random),
      changeHints: new ChangeHints(session),
      disconnectPlayer: new DisconnectPlayer(session, systemClock),
      startMatch: new StartMatch(session, random),
      playTurn: new PlayTurn(session, random),
      readGame: new ReadGame(session),
    },
    registry,
    metrics,
    logger,
    systemClock,
    {
      presentation: { presenter, messages: createErrorMessages(gameAdapters.errorMessages()) },
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

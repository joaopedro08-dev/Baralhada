import type { Clock, RemovalReason, RoomNotifier } from "../../application/ports.js"
import type { PlayerId } from "../../domain/game/model.js"
import type { Room } from "../../domain/room/room.js"
import type { CommandMetrics } from "./connection.js"
import { createRoomStatePresenter } from "./presenter.js"
import type { SessionRegistry } from "./session-registry.js"

export class SocketNotifier implements RoomNotifier {
  constructor(
    private readonly registry: SessionRegistry,
    private readonly metrics: CommandMetrics,
    private readonly clock: Clock
  ) {}

  publish(room: Room): void {
    const startedAt = performance.now()
    const present = createRoomStatePresenter(room, this.clock.now())
    let recipients = 0
    for (const player of room.players) {
      const connection = this.registry.connectionOf(player.id)
      if (!connection) continue
      connection.emit("room:state", present(player.id))
      recipients++
    }
    this.metrics.observeBroadcast(recipients, (performance.now() - startedAt) / 1000)
  }

  notifyRemoved(playerId: PlayerId, reason: RemovalReason): void {
    this.registry.release(playerId)?.emit("room:removed", { reason })
  }
}

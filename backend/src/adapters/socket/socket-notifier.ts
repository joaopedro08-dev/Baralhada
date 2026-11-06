import type { Clock, RemovalReason, RoomNotifier } from "../../application/ports.js"
import type { Room } from "../../domain/room/room.js"
import type { PlayerId } from "../../domain/shared/seat.js"
import type { CommandMetrics } from "./connection.js"
import type { RoomPresenter } from "./presenter.js"
import type { SessionRegistry } from "./session-registry.js"

export class SocketNotifier implements RoomNotifier {
  constructor(
    private readonly registry: SessionRegistry,
    private readonly metrics: CommandMetrics,
    private readonly clock: Clock,
    private readonly presenter: RoomPresenter
  ) {}

  publish(room: Room): void {
    const startedAt = performance.now()
    const present = this.presenter.present(room, this.clock.now())
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

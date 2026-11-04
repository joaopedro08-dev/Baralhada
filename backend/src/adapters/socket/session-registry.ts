import type { Actor } from "../../application/room-session.js"
import type { PlayerId } from "../../domain/game/model.js"
import type { ClientConnection } from "./connection.js"

export interface ClientSession {
  readonly connection: ClientConnection
  actor: Actor | null
}

export class SessionRegistry {
  private readonly sessions = new Map<PlayerId, ClientSession>()

  bind(session: ClientSession, actor: Actor): void {
    const previous = this.sessions.get(actor.playerId)
    if (previous && previous !== session) {
      previous.actor = null
      previous.connection.close()
    }
    session.actor = actor
    this.sessions.set(actor.playerId, session)
  }

  unbind(session: ClientSession): void {
    if (session.actor) this.sessions.delete(session.actor.playerId)
    session.actor = null
  }

  connectionOf(playerId: PlayerId): ClientConnection | undefined {
    return this.sessions.get(playerId)?.connection
  }

  release(playerId: PlayerId): ClientConnection | undefined {
    const session = this.sessions.get(playerId)
    if (session) this.unbind(session)
    return session?.connection
  }
}

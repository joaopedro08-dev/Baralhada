import { chooseStartingPlayer, startGame } from "../../domain/game/setup.js"
import { canStart, isHost, statusOf } from "../../domain/room/room.js"
import type { RandomSource } from "../../domain/shared/random.js"
import { err, ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

export class StartMatch {
  constructor(
    private readonly session: RoomSession,
    private readonly random: RandomSource
  ) {}

  execute(actor: Actor): Result<null, ApplicationErrorCode> {
    const loaded = this.session.loadAsMember(actor)
    if (!loaded.ok) return loaded
    const room = loaded.value

    if (!isHost(room, actor.playerId)) return err("NOT_HOST")
    if (statusOf(room) === "playing") return err("GAME_ALREADY_STARTED")
    if (!canStart(room)) return err("NOT_ENOUGH_PLAYERS")

    const starterId = chooseStartingPlayer(room.players, room.lastStarterId, this.random)
    const game = startGame(room.players, starterId, this.random)
    if (!game.ok) return game

    this.session.commit({
      ...room,
      game: game.value,
      lastStarterId: starterId,
      matchStartsAt: this.session.countdownEnd(),
      timedTurnNumber: null,
    })
    return ok(null)
  }
}

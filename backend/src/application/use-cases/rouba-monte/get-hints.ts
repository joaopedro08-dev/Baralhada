import type { GameErrorCode } from "../../../domain/games/rouba-monte/errors.js"
import { computeHints } from "../../../domain/games/rouba-monte/hints.js"
import type { Hints } from "../../../domain/games/rouba-monte/hints.js"
import type { Game } from "../../../domain/games/rouba-monte/model.js"
import { countRanksInPiles, toPlayerView } from "../../../domain/games/rouba-monte/player-view.js"
import type { PlayerView } from "../../../domain/games/rouba-monte/player-view.js"
import type { TurnAction } from "../../../domain/games/rouba-monte/turn-actions.js"
import { ok } from "../../../domain/shared/result.js"
import type { Result } from "../../../domain/shared/result.js"
import type { ApplicationErrorCode } from "../../errors.js"
import type { Actor, RoomSession } from "../../room-session.js"

export interface HintsResult {
  readonly hints: Hints
  readonly players: PlayerView["players"]
}

export class GetHints {
  constructor(private readonly session: RoomSession<Game, TurnAction, GameErrorCode>) {}

  execute(actor: Actor): Result<HintsResult, ApplicationErrorCode> {
    const running = this.session.loadRunningGame(actor)
    if (!running.ok) return running
    const { game } = running.value
    const view = toPlayerView(game, actor.playerId)
    return ok({ hints: computeHints(view, countRanksInPiles(game)), players: view.players })
  }
}

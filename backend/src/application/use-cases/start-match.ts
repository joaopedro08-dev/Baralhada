import { lockTeams, teamOf } from "../../domain/room/teams.js"
import { chooseStartingPlayer } from "../../domain/room/turn-order.js"
import type { Room } from "../../domain/room/room.js"
import type { RandomSource } from "../../domain/shared/random.js"
import { err, ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { Seat } from "../../domain/shared/seat.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

const seatsOf = (room: Room, teamCount: number | null): readonly Seat[] =>
  room.players.map(({ id, nickname }) => ({
    id,
    nickname,
    team: teamCount === null ? null : teamOf(room, id, teamCount),
  }))

export class StartMatch {
  constructor(
    private readonly session: RoomSession,
    private readonly random: RandomSource
  ) {}

  execute(actor: Actor): Result<null, ApplicationErrorCode<string>> {
    const loaded = this.session.loadAsIdleHost(actor)
    if (!loaded.ok) return loaded
    const room = loaded.value

    const problem = this.session.startProblemOf(room)
    if (problem) return err(problem)

    const rules = this.session.rulesOf(room)
    const seated = rules.teamCount === null ? room : lockTeams(room, rules.teamCount)
    const starterId = chooseStartingPlayer(seated.players, seated.lastStarterId, this.random)
    const game = rules.start(seatsOf(seated, rules.teamCount), starterId, this.random)
    if (!game.ok) return game

    this.session.commit({
      ...seated,
      game: game.value,
      lastStarterId: starterId,
      matchStartsAt: this.session.countdownEnd(),
      pausedUntil: null,
      pausedAt: null,
      timedTurnNumber: null,
    })
    return ok(null)
  }
}

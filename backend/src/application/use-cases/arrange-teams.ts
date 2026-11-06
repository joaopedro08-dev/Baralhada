import { findRoomPlayer } from "../../domain/room/room.js"
import type { Room } from "../../domain/room/room.js"
import { drawTeams, moveToTeam } from "../../domain/room/teams.js"
import type { RandomSource } from "../../domain/shared/random.js"
import { err, ok } from "../../domain/shared/result.js"
import type { Result } from "../../domain/shared/result.js"
import type { PlayerId } from "../../domain/shared/seat.js"
import type { ApplicationErrorCode } from "../errors.js"
import type { Actor, RoomSession } from "../room-session.js"

interface TeamRoom {
  readonly room: Room
  readonly teamCount: number
}

export class ArrangeTeams {
  constructor(
    private readonly session: RoomSession,
    private readonly random: RandomSource
  ) {}

  move(actor: Actor, playerId: PlayerId, team: number): Result<null, ApplicationErrorCode> {
    const loaded = this.loadTeamRoom(actor)
    if (!loaded.ok) return loaded
    const { room, teamCount } = loaded.value
    if (!findRoomPlayer(room, playerId)) return err("PLAYER_NOT_IN_ROOM")
    if (!Number.isInteger(team) || team < 0 || team >= teamCount) return err("INVALID_TEAM")
    this.session.commit(moveToTeam(room, playerId, team, teamCount))
    return ok(null)
  }

  draw(actor: Actor): Result<null, ApplicationErrorCode> {
    const loaded = this.loadTeamRoom(actor)
    if (!loaded.ok) return loaded
    const { room, teamCount } = loaded.value
    this.session.commit(drawTeams(room, teamCount, this.random))
    return ok(null)
  }

  private loadTeamRoom(actor: Actor): Result<TeamRoom, ApplicationErrorCode> {
    const loaded = this.session.loadAsIdleHost(actor)
    if (!loaded.ok) return loaded
    const { teamCount } = this.session.rulesOf(loaded.value)
    return teamCount === null ? err("GAME_HAS_NO_TEAMS") : ok({ room: loaded.value, teamCount })
  }
}
